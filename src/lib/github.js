const axios = require('axios');
const querystring = require('querystring');
const get = require('lodash.get');
const constants = require('./constants');

let accessToken;
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
    .catch(handleError)
    .then(res =>
      res.data.map(commit => {
        const message = getCommitMessage(commit.commit.message);
        return {
          message,
          sha: commit.sha
        };
      })
    );
}

function getCommit(owner, repoName, sha) {
  return axios(
    `https://api.github.com/repos/${owner}/${repoName}/commits/${sha}?access_token=${accessToken}`
  )
    .catch(handleError)
    .then(res => ({
      message: res.data.commit.message,
      sha: res.data.sha
    }));
}

function createPullRequest(owner, repoName, payload) {
  return axios
    .post(
      `https://api.github.com/repos/${owner}/${repoName}/pulls?access_token=${accessToken}`,
      payload
    )
    .catch(handleError);
}

function addLabels(owner, repoName, pullNumber, labels) {
  return axios
    .post(
      `https://api.github.com/repos/${owner}/${repoName}/issues/${pullNumber}/labels?access_token=${accessToken}`,
      labels
    )
    .catch(handleError);
}

function getPullRequestByCommit(owner, repoName, commitSha) {
  return axios(
    `https://api.github.com/search/issues?q=repo:${owner}/${repoName}+${commitSha}&access_token=${accessToken}`
  )
    .catch(handleError)
    .then(res => get(res.data.items[0], 'number'));
}

function setAccessToken(_accessToken) {
  accessToken = _accessToken;
}

class GithubError extends Error {
  constructor(message) {
    super();
    Error.captureStackTrace(this, GithubError);
    this.code = constants.GITHUB_ERROR;
    this.message = message;
  }
}

function handleError(e) {
  if (get(e.response, 'data')) {
    throw new GithubError(e.response.data);
  }

  throw e;
}

module.exports = {
  setAccessToken,
  addLabels,
  createPullRequest,
  getCommit,
  getCommits,
  getPullRequestByCommit
};
