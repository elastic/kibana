const github = require('./github');
const { ensureConfigAndFoldersExists, validateConfig } = require('./configs');
const {
  promptRepoInfo,
  promptCommit,
  promptVersions,
  getReference,
  doBackportVersions,
  handleErrors,
  maybeSetupRepo
} = require('./cliService');

function init(config, options) {
  let commit, versions, reference, owner, repoName;

  return ensureConfigAndFoldersExists()
    .then(() => validateConfig(config))
    .then(() => github.setAccessToken(config.accessToken))
    .then(() => promptRepoInfo(config.repositories, options.cwd))
    .then(({ owner: _owner, repoName: _repoName }) => {
      owner = _owner;
      repoName = _repoName;
    })
    .then(() =>
      promptCommit(owner, repoName, options.own ? config.username : null)
    )
    .then(c => (commit = c))
    .then(() =>
      promptVersions(owner, repoName, config.repositories, options.multiple)
    )
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
        username: config.username
      })
    )
    .catch(handleErrors);
}

module.exports = {
  init
};
