const github = require('../lib/github');
const {
  ensureConfigAndFoldersExists,
  validateConfig,
  getRepoConfig
} = require('../lib/configs');
const {
  promptRepoInfo,
  getCommits,
  promptVersions,
  doBackportVersions,
  handleErrors,
  maybeSetupRepo
} = require('./cliService');

function initSteps(options) {
  let commits, versions, owner, repoName, repoConfig;

  return ensureConfigAndFoldersExists()
    .then(() => validateConfig(options))
    .then(() => github.setAccessToken(options.accessToken))
    .then(() => promptRepoInfo(options.repositories, options.cwd))
    .then(({ owner: _owner, repoName: _repoName }) => {
      owner = _owner;
      repoName = _repoName;
      repoConfig = getRepoConfig(owner, repoName, options.repositories);
    })
    .then(() => getCommits(owner, repoName, options))
    .then(c => (commits = c))
    .then(() => promptVersions(repoConfig.versions, options.multipleVersions))
    .then(v => (versions = v))
    .then(() => maybeSetupRepo(owner, repoName, options.username))
    .then(() =>
      doBackportVersions({
        owner,
        repoName,
        commits,
        versions,
        username: options.username,
        labels: repoConfig.labels
      })
    )
    .catch(handleErrors);
}

module.exports = initSteps;
