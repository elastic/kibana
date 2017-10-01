const axios = require('axios');
let accessToken;

function getPullRequest(commitMessage) {
  const matches = commitMessage.match(/\(#(\d+)\)$/) || [];
  return matches[1];
}

function getCommits(repoName, author) {
  return axios(
    `https://api.github.com/repos/elastic/${repoName}/commits?author=${author}&per_page=5&access_token=${accessToken}`
  ).then(res =>
    res.data.map(commit => {
      const message = commit.commit.message.split('\n')[0].trim();
      const pullRequest = getPullRequest(message);
      return {
        message,
        sha: commit.sha,
        date: commit.commit.author.date,
        pullRequest
      };
    })
  );
}

function createPullRequest(repoName, payload) {
  return axios.post(
    `https://api.github.com/repos/elastic/${repoName}/pulls?access_token=${accessToken}`,
    payload
  );
}

function setAccessToken(_accessToken) {
  accessToken = _accessToken;
}

module.exports = {
  setAccessToken,
  createPullRequest,
  getCommits
};
