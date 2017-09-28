const axios = require('axios');
const { accessToken } = require('./configs');

function getCommits(repoName, author) {
  return axios(
    `https://api.github.com/repos/elastic/${repoName}/commits?author=${author}&per_page=5&access_token=${accessToken}`
  );
}

function getPullRequestSha(repoName, pullRequest) {
  return axios(
    `https://api.github.com/repos/elastic/${repoName}/pulls/${pullRequest}?access_token=${accessToken}`
  ).then(res => res.data.merge_commit_sha);
}

function createPullRequest(repoName, payload) {
  return axios.post(
    `https://api.github.com/repos/elastic/${repoName}/pulls?access_token=${accessToken}`,
    payload
  );
}

module.exports = {
  getCommits,
  getPullRequestSha,
  createPullRequest
};
