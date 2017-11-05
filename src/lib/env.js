const path = require('path');
const os = require('os');

const getBackportDirPath = () => {
  const homedir = os.homedir();
  return path.join(homedir, '.backport');
};

const getConfigFilePath = () => {
  const homedir = os.homedir();
  return path.join(homedir, '.backport', 'config.json');
};

const getRepositoriesDirPath = () => {
  const homedir = os.homedir();
  return path.join(homedir, '.backport', 'repositories');
};

const getRepoOwnerDirPath = owner => {
  const homedir = os.homedir();
  return path.join(homedir, '.backport', 'repositories', owner);
};

const getRepoPath = (owner, repoName) => {
  const homedir = os.homedir();
  return path.join(homedir, '.backport', 'repositories', owner, repoName);
};

module.exports = {
  getBackportDirPath,
  getRepositoriesDirPath,
  getConfigFilePath,
  getRepoOwnerDirPath,
  getRepoPath
};
