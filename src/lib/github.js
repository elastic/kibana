const axios = require('axios');
const querystring = require('querystring');
const constants = require('./constants');
let accessToken;

function throwGithubError(e) {
  if (e.response && e.response.data) {
    const error = new Error('An error occured while communicating with Github');
    error.details = e.response.data;
    error.code = constants.GITHUB_ERROR;
    throw error;
  }

  throw e;
}

function getCommitMessage(message) {
  return message.split('\n')[0].trim();
}

function getCommits(owner, repoName, author) {
  const urlArgs = {
    per_page: 20,
    access_token: accessToken
  };

  if (author) {
    urlArgs.author = author;
    urlArgs.per_page = 5;
  }

  return axios(
    `https://api.github.com/repos/${owner}/${repoName}/commits?${querystring.stringify(
      urlArgs
    )}`
  )
    .catch(throwGithubError)
    .then(res =>
      res.data.map(commit => {
        const message = getCommitMessage(commit.commit.message);
        return {
          message,
          sha: commit.sha,
          date: commit.commit.author.date
        };
      })
    );
}

function createPullRequest(owner, repoName, payload) {
  return axios
    .post(
      `https://api.github.com/repos/${owner}/${repoName}/pulls?access_token=${accessToken}`,
      payload
    )
    .catch(throwGithubError);
}

function addLabels(owner, repoName, pullNumber, labels) {
  return axios
    .post(
      `https://api.github.com/repos/${owner}/${repoName}/issues/${pullNumber}/labels?access_token=${accessToken}`,
      labels
    )
    .catch(throwGithubError);
}

function getPullRequestByCommit(owner, repoName, commitSha) {
  return axios(
    `https://api.github.com/search/issues?q=repo:${owner}/${repoName}+${commitSha}&access_token=${accessToken}`
  )
    .catch(throwGithubError)
    .then(res => res.data.items[0] && res.data.items[0].number);
}

function setAccessToken(_accessToken) {
  accessToken = _accessToken;
}

module.exports = {
  setAccessToken,
  addLabels,
  createPullRequest,
  getCommits,
  getPullRequestByCommit
};
