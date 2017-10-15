const github = require('./github');
const { ensureConfigAndFoldersExists, validateConfig } = require('./configs');
const {
  getRepoInfo,
  getCommit,
  getVersion,
  getReference,
  getReferenceValue,
  doBackportVersion,
  handleErrors,
  maybeSetupRepo
} = require('./cliService');

function init(config, options) {
  let commit, version, reference, owner, repoName;

  return ensureConfigAndFoldersExists()
    .then(() => validateConfig(config))
    .then(() => github.setAccessToken(config.accessToken))
    .then(() => getRepoInfo(config.repositories, options.cwd))
    .then(({ owner: _owner, repoName: _repoName }) => {
      owner = _owner;
      repoName = _repoName;
    })
    .then(() => getCommit(owner, repoName, config.username))
    .then(c => (commit = c))
    .then(() => getVersion(owner, repoName, config.repositories))
    .then(v => (version = v))
    .then(() => getReference(owner, repoName, commit.sha))
    .then(ref => (reference = ref))
    .then(() => {
      console.log(`Backporting ${getReferenceValue(reference)} to ${version}`);
    })
    .then(() => maybeSetupRepo(owner, repoName, config.username))
    .then(() =>
      doBackportVersion({
        owner,
        repoName,
        commit,
        reference,
        version,
        username: config.username
      })
    )
    .then(res => console.log(`View pull request: ${res.data.html_url}`))
    .catch(handleErrors);
}

module.exports = {
  init
};
