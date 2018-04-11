const axios = require('axios');
const querystring = require('querystring');
const get = require('lodash.get');
const { GithubError } = require('./errors');

let accessToken;
function getCommitMessage(message) {
  return message.split('\n')[0].trim();
}

async function getCommits(owner, repoName, author) {
  const urlArgs = {
    per_page: 20,
    access_token: accessToken
  };

  if (author) {
    urlArgs.author = author;
    urlArgs.per_page = 5;
  }

  try {
    const res = await axios(
      `https://api.github.com/repos/${owner}/${repoName}/commits?${querystring.stringify(
        urlArgs
      )}`
    );

    return res.data.map(commit => {
      const message = getCommitMessage(commit.commit.message);
      return {
        message,
        sha: commit.sha
      };
    });
  } catch (e) {
    return handleError(e);
  }
}

async function getCommit(owner, repoName, sha) {
  try {
    const res = await axios(
      `https://api.github.com/repos/${owner}/${repoName}/commits/${sha}?access_token=${accessToken}`
    );
    return {
      message: res.data.commit.message,
      sha: res.data.sha
    };
  } catch (e) {
    return handleError(e);
  }
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

async function getPullRequestByCommit(owner, repoName, commitSha) {
  try {
    const res = await axios(
      `https://api.github.com/search/issues?q=repo:${owner}/${repoName}+${commitSha}&access_token=${accessToken}`
    );
    return get(res.data.items[0], 'number');
  } catch (e) {
    return handleError(e);
  }
}

function setAccessToken(_accessToken) {
  accessToken = _accessToken;
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
