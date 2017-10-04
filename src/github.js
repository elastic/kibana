const axios = require('axios');
const constants = require('./constants');
let accessToken;

function getReference(commitMessage, commitSha) {
  const [, pullRequest] = commitMessage.match(/\(#(\d+)\)$/) || [];
  if (pullRequest) {
    return { type: 'pullRequest', value: pullRequest };
  }

  return { type: 'commit', value: commitSha.slice(0, 7) };
}

function getCommitMessage(message) {
  return message.split('\n')[0].trim();
}

function getCommits(owner, repoName, author) {
  return axios(
    `https://api.github.com/repos/${owner}/${repoName}/commits?author=${author}&per_page=5&access_token=${accessToken}`
  )
    .then(res =>
      res.data.map(commit => {
        const message = getCommitMessage(commit.commit.message);
        const reference = getReference(message, commit.sha);
        return {
          message,
          sha: commit.sha,
          date: commit.commit.author.date,
          reference
        };
      })
    )
    .catch(e => {
      const error = new Error(constants.GITHUB_ERROR);
      error.details = e.response.data;
      throw error;
    });
}

function createPullRequest(owner, repoName, payload) {
  return axios
    .post(
      `https://api.github.com/repos/${owner}/${repoName}/pulls?access_token=${accessToken}`,
      payload
    )
    .catch(e => {
      const error = new Error(constants.GITHUB_ERROR);
      error.details = e.response.data;
      throw error;
    });
}

function setAccessToken(_accessToken) {
  accessToken = _accessToken;
}

module.exports = {
  setAccessToken,
  createPullRequest,
  getCommits
};
