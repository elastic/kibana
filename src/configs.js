const promisify = require('es6-promisify');
const path = require('path');
const fs = require('fs');
const homedir = require('os').homedir();
const stripJsonComments = require('strip-json-comments');
const constants = require('./constants');

const mkdirp = promisify(require('mkdirp'));
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

const BACKPORT_DIR_PATH = path.join(homedir, '.backport');
const REPOSITORIES_DIR_PATH = path.join(BACKPORT_DIR_PATH, 'repositories');
const CONFIG_FILE_PATH = path.join(BACKPORT_DIR_PATH, 'config.json');

const { username, accessToken } = getConfig();

function ensureConfigAndFoldersExists() {
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

function validateConfig() {
  if (!username || !accessToken) {
    throw new Error(constants.INVALID_CONFIG);
  }
}

function getConfig() {
  try {
    const res = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
    return JSON.parse(stripJsonComments(res));
  } catch (e) {
    if (e.code === 'ENOENT') {
      return {};
    }
    console.log(e);
  }
}

function getRepoPath(repoName) {
  return path.join(REPOSITORIES_DIR_PATH, repoName);
}

module.exports = {
  getRepoPath,
  ensureConfigAndFoldersExists,
  CONFIG_FILE_PATH,
  REPOSITORIES_DIR_PATH,
  getConfig,
  validateConfig
};
