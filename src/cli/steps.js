const github = require('../lib/github');
const {
  ensureConfigAndFoldersExists,
  validateConfig,
  getRepoConfig
} = require('../lib/configs');
const {
  promptRepoInfo,
  promptCommit,
  promptVersions,
  getReference,
  doBackportVersions,
  handleErrors,
  maybeSetupRepo
} = require('./cliService');

function initSteps(config, options) {
  let commit, versions, reference, owner, repoName, repoConfig;

  return ensureConfigAndFoldersExists()
    .then(() => validateConfig(config))
    .then(() => github.setAccessToken(config.accessToken))
    .then(() => promptRepoInfo(config.repositories, options.cwd))
    .then(({ owner: _owner, repoName: _repoName }) => {
      owner = _owner;
      repoName = _repoName;
      repoConfig = getRepoConfig(owner, repoName, config.repositories);
    })
    .then(() =>
      promptCommit(owner, repoName, options.own ? config.username : null)
    )
    .then(c => (commit = c))
    .then(() => promptVersions(repoConfig.versions, options.multiple))
    .then(v => (versions = v))
    .then(() => getReference(owner, repoName, commit.sha))
    .then(ref => (reference = ref))
    .then(() => maybeSetupRepo(owner, repoName, config.username))
    .then(() =>
      doBackportVersions({
        owner,
        repoName,
        commit,
        reference,
        versions,
        username: config.username,
        labels: repoConfig.labels
      })
    )
    .catch(handleErrors);
}

module.exports = initSteps;
