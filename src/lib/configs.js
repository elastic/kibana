const path = require('path');
const fs = require('fs');
const stripJsonComments = require('strip-json-comments');
const constants = require('./constants');
const env = require('./env');
const rpc = require('./rpc');

function ensureConfigAndFoldersExists() {
  const REPOS_PATH = env.getReposPath();
  const CONFIG_PATH = env.getConfigPath();

  return rpc
    .mkdirp(REPOS_PATH)
    .then(getConfigTemplate)
    .then(configTemplate => {
      return rpc
        .writeFile(CONFIG_PATH, configTemplate, {
          flag: 'wx', // create and write file. Error if it already exists
          mode: 0o600 // give the owner read-write privleges, no access for others
        })
        .catch(e => {
          const FILE_ALREADY_EXISTS = 'EEXIST';
          if (e.code !== FILE_ALREADY_EXISTS) {
            throw e;
          }
        });
    });
}

function getRepoConfig(owner, repoName, repositories) {
  return repositories.find(repo => repo.name === `${owner}/${repoName}`);
}

function getConfigTemplate() {
  return rpc.readFile(path.join(__dirname, 'configTemplate.json'), 'utf8');
}

class InvalidConfigError extends Error {
  constructor(...args) {
    super(...args);
    Error.captureStackTrace(this, InvalidConfigError);
    this.code = constants.INVALID_CONFIG;
  }
}

function validateConfig({ username, accessToken, repositories }) {
  const CONFIG_PATH = env.getConfigPath();
  const hasCorrectPerms = hasConfigCorrectPermissions(CONFIG_PATH);

  if (!username && !accessToken) {
    throw new InvalidConfigError(
      `Welcome to the Backport tool. Please add your Github username, and a Github access token to the config: ${CONFIG_PATH}`
    );
  }

  if (!username) {
    throw new InvalidConfigError(
      `Please add your username to the config: ${CONFIG_PATH}`
    );
  }

  if (!accessToken) {
    throw new InvalidConfigError(
      `Please add a Github access token to the config: ${CONFIG_PATH}`
    );
  }

  if (!repositories || repositories.length === 0) {
    throw new InvalidConfigError(
      `You must add at least 1 repository: ${CONFIG_PATH}`
    );
  }

  if (!hasCorrectPerms) {
    throw new InvalidConfigError(
      `Config file at ${CONFIG_PATH} needs to have more restrictive permissions. Run the ` +
        'following to limit access to the file to just your user account:\n' +
        '\n' +
        `  chmod 600 "${CONFIG_PATH}"\n`
    );
  }
}

function hasConfigCorrectPermissions(CONFIG_PATH) {
  const stat = rpc.statSync(CONFIG_PATH);
  const hasGroupRead = stat.mode & fs.constants.S_IRGRP;
  const hasOthersRead = stat.mode & fs.constants.S_IROTH;
  return !hasGroupRead && !hasOthersRead;
}

function getConfig() {
  const CONFIG_PATH = env.getConfigPath();

  try {
    const res = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(stripJsonComments(res));
  } catch (e) {
    if (e.code === 'ENOENT') {
      return {};
    }

    throw e;
  }
}

module.exports = {
  ensureConfigAndFoldersExists,
  getConfig,
  getRepoConfig,
  validateConfig
};
