import React, { useState, useEffect } from 'react'
import mockUser from './mockData.js/mockUser'
import mockRepos from './mockData.js/mockRepos'
import mockFollowers from './mockData.js/mockFollowers'
import axios from 'axios'

const rootUrl = 'https://api.github.com'

const GithubContext = React.createContext()

const GithubProvider = ({ children }) => {
  const [githubUser, setGithubUser] = useState(mockUser)
  const [followers, setFollowers] = useState(mockFollowers)
  const [repos, setRepos] = useState(mockRepos)
  const [githubUsername, setGithubUsername] = useState('')
  const [remainingRequests, setRemainingRequests] = useState(0)
  const [requestLimit, setRequestLimit] = useState(0)
  const [isLoading, setisLoading] = useState(false)
  const [error, setError] = useState({
    isError: false,
    errorMsg: '',
  })

  //check remaining requests
  const checkRemainingRequests = () => {
    axios(`${rootUrl}/rate_limit`)
      .then(({ data }) => {
        const { rate } = data
        let { remaining, limit } = rate
        setRemainingRequests(remaining)
        setRequestLimit(limit)
        if (remaining === 0) {
          showError(true, 'sorry, you have exceeded your hourly rate limit!')
        }
      })
      .catch((error) => console.log(error))
  }
  useEffect(checkRemainingRequests, [])

  //error function- default remove error

  const showError = (isError = false, errorMsg = '') => {
    setError({
      isError,
      errorMsg,
    })
  }

  //handleChange function
  const handleChange = (e) => {
    setGithubUsername(e.target.value)
  }

  //searchUser function
  const fetchUser = async (githubUsername) => {
    setisLoading(true)
    showError()

    const response = await axios(`${rootUrl}/users/${githubUsername}`).catch(
      (error) => {
        console.log(error)
        setisLoading(false)
      }
    )

    if (response) {
      const { data } = response
      setGithubUser(data)
      const { login, followers_url } = data

      await Promise.allSettled([
        axios(`${rootUrl}/users/${login}/repos?per_page=100`),
        axios(`${followers_url}?per_page=100`),
      ])
        .then((response) => {
          const [repos, followers] = response
          const status = 'fulfilled'

          if (repos.status === status) {
            setRepos(repos.value.data)
          }
          if (followers.status === status) {
            setFollowers(followers.value.data)
          }
        })
        .catch((error) => console.log(error))
    } else {
      showError(true, 'There Is No User With That Username')
    }
    checkRemainingRequests()
    setisLoading(false)
  }
  //handleSubmit function
  const handleSubmit = (e) => {
    e.preventDefault()
    if (githubUsername) {
      fetchUser(githubUsername)
    }
  }

  return (
    <GithubContext.Provider
      value={{
        githubUser,
        followers,
        repos,
        handleSubmit,
        handleChange,
        githubUsername,
        remainingRequests,
        requestLimit,
        ...error,
        isLoading,
      }}
    >
      {children}
    </GithubContext.Provider>
  )
}

const useGlobalContext = () => {
  return React.useContext(GithubContext)
}

export { GithubProvider, useGlobalContext }
