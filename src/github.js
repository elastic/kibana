const axios = require('axios');
const { getConfig } = require('./configs');
const { accessToken } = getConfig();

function getPullRequest(commitMessage) {
  const matches = commitMessage.match(/\(#(\d+)\)$/) || [];
  return matches[1];
}

function getCommits(repoName, author) {
  return axios(
    `https://api.github.com/repos/elastic/${repoName}/commits?author=${author}&per_page=5&access_token=${accessToken}`
  ).then(res =>
    res.data.map(commit => {
      const message = commit.commit.message;
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
  createPullRequest,
  getCommits,
  getPullRequestSha
};
