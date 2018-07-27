const axios = require('axios');
const querystring = require('querystring');
const get = require('lodash.get');
const { HandledError } = require('./errors');

let accessToken;
function getCommitMessage(message) {
  return message.split('\n')[0].trim();
}

async function getCommits(owner, repoName, author) {
  const query = {
    per_page: 20,
    access_token: accessToken
  };

  if (author) {
    query.author = author;
    query.per_page = 5;
  }

  try {
    const res = await axios(
      `https://api.github.com/repos/${owner}/${repoName}/commits?${querystring.stringify(
        query
      )}`
    );

    return res.data.map(commit => {
      return {
        message: getCommitMessage(commit.commit.message),
        sha: commit.sha
      };
    });
  } catch (e) {
    throw getError(e);
  }
}

async function getCommit(owner, repoName, sha) {
  try {
    const res = await axios(
      `https://api.github.com/repos/${owner}/${repoName}/commits/${sha}?access_token=${accessToken}`
    );
    return {
      message: getCommitMessage(res.data.commit.message),
      sha: res.data.sha
    };
  } catch (e) {
    throw getError(e);
  }
}

async function createPullRequest(owner, repoName, payload) {
  try {
    return await axios.post(
      `https://api.github.com/repos/${owner}/${repoName}/pulls?access_token=${accessToken}`,
      payload
    );
  } catch (e) {
    throw getError(e);
  }
}

async function addLabels(owner, repoName, pullNumber, labels) {
  try {
    return await axios.post(
      `https://api.github.com/repos/${owner}/${repoName}/issues/${pullNumber}/labels?access_token=${accessToken}`,
      labels
    );
  } catch (e) {
    throw getError(e);
  }
}

async function getPullRequestByCommit(owner, repoName, commitSha) {
  try {
    const res = await axios(
      `https://api.github.com/search/issues?q=repo:${owner}/${repoName}+${commitSha}&access_token=${accessToken}`
    );
    return get(res.data.items[0], 'number');
  } catch (e) {
    throw getError(e);
  }
}

function setAccessToken(_accessToken) {
  accessToken = _accessToken;
}

function getError(e) {
  if (get(e.response, 'data')) {
    return new HandledError(e.response.data);
  }

  return e;
}

module.exports = {
  setAccessToken,
  addLabels,
  createPullRequest,
  getCommit,
  getCommits,
  getPullRequestByCommit
};
