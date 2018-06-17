const isEmpty = require('lodash.isempty');
const github = require('../lib/github');
const {
  getCommitByPrompt,
  getCommitBySha,
  getBranchesByPrompt,
  doBackportVersions,
  handleErrors,
  maybeSetupRepo
} = require('./cliService');

async function initSteps(config, options = {}) {
  const [owner, repoName] = config.upstream.split('/');
  github.setAccessToken(config.accessToken);

  try {
    const commits = options.sha
      ? await getCommitBySha({ owner, repoName, sha: options.sha })
      : await getCommitByPrompt({
          owner,
          repoName,
          author: config.all ? null : config.username,
          multipleCommits: config.multipleCommits
        });

    const branches = !isEmpty(options.branches)
      ? options.branches
      : await getBranchesByPrompt(config.branches, config.multipleBranches);

    await maybeSetupRepo(owner, repoName, config.username);
    await doBackportVersions({
      owner,
      repoName,
      commits,
      branches,
      username: config.username,
      labels: config.labels
    });
  } catch (e) {
    handleErrors(e);
  }
}

module.exports = initSteps;
