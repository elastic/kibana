const promisify = require('es6-promisify');
const path = require('path');
const fs = require('fs');
const stripJsonComments = require('strip-json-comments');
const constants = require('./constants');
const env = require('./env');

const mkdirp = promisify(require('mkdirp'));
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

function ensureConfigAndFoldersExists() {
  const REPOSITORIES_DIR_PATH = env.getRepositoriesDirPath();
  const CONFIG_FILE_PATH = env.getConfigFilePath();

  return mkdirp(REPOSITORIES_DIR_PATH)
    .then(getConfigTemplate)
    .then(configTemplate => {
      return writeFile(CONFIG_FILE_PATH, configTemplate, {
        flag: 'wx'
      }).catch(e => {
        if (e.code !== 'EEXIST') {
          throw e;
        }
      });
    });
}

function getConfigTemplate() {
  return readFile(path.join(__dirname, 'configTemplate.json'), 'utf8');
}

function validateConfig({ username, accessToken, repositories }) {
  if (!username || !accessToken || !repositories || repositories.length === 0) {
    throw new Error(constants.INVALID_CONFIG);
  }
}

function getConfig() {
  try {
    const CONFIG_FILE_PATH = env.getConfigFilePath();
    const res = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
    return JSON.parse(stripJsonComments(res));
  } catch (e) {
    if (e.code === 'ENOENT') {
      return {};
    }
    console.log(e);
  }
}

module.exports = {
  ensureConfigAndFoldersExists,
  getConfig,
  validateConfig
};
