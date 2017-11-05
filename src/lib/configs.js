const path = require('path');
const fs = require('fs');
const stripJsonComments = require('strip-json-comments');
const constants = require('./constants');
const env = require('./env');
const rpc = require('./rpc');

function ensureConfigAndFoldersExists() {
  const REPOSITORIES_DIR_PATH = env.getRepositoriesDirPath();
  const CONFIG_FILE_PATH = env.getConfigFilePath();

  return rpc
    .mkdirp(REPOSITORIES_DIR_PATH)
    .then(getConfigTemplate)
    .then(configTemplate => {
      return rpc
        .writeFile(CONFIG_FILE_PATH, configTemplate, {
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

function InvalidConfigError(message) {
  const e = new Error(message);
  e.code = constants.INVALID_CONFIG;
  return e;
}

function validateConfig({ username, accessToken, repositories }) {
  const configFilePath = env.getConfigFilePath();
  const hasCorrectPerms = hasConfigCorrectPermissions(configFilePath);

  if (!username && !accessToken) {
    throw InvalidConfigError(
      `Welcome to the Backport tool. Please add your Github username, and a Github access token to the config: ${configFilePath}`
    );
  }

  if (!username) {
    throw InvalidConfigError(
      `Please add your username to the config: ${configFilePath}`
    );
  }

  if (!accessToken) {
    throw InvalidConfigError(
      `Please add a Github access token to the config: ${configFilePath}`
    );
  }

  if (!repositories || repositories.length === 0) {
    throw InvalidConfigError(
      `You must add at least 1 repository: ${configFilePath}`
    );
  }

  if (!hasCorrectPerms) {
    throw InvalidConfigError(
      `Config file at ${configFilePath} needs to have more restrictive permissions. Run the ` +
        'following to limit access to the file to just your user account:\n' +
        '\n' +
        `  chmod 600 "${configFilePath}"\n`
    );
  }
}

function hasConfigCorrectPermissions(configFilePath) {
  const stat = rpc.statSync(configFilePath);
  const hasGroupRead = stat.mode & fs.constants.S_IRGRP;
  const hasOthersRead = stat.mode & fs.constants.S_IROTH;
  return !hasGroupRead && !hasOthersRead;
}

function getConfig() {
  const CONFIG_FILE_PATH = env.getConfigFilePath();

  try {
    const res = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
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
