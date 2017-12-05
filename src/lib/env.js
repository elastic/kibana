const path = require('path');
const os = require('os');

const getGlobalConfigPath = () => {
  const homedir = os.homedir();
  return path.join(homedir, '.backport', 'config.json');
};

const getReposPath = () => {
  const homedir = os.homedir();
  return path.join(homedir, '.backport', 'repositories');
};

const getRepoOwnerPath = owner => {
  const homedir = os.homedir();
  return path.join(homedir, '.backport', 'repositories', owner);
};

const getRepoPath = (owner, repoName) => {
  const homedir = os.homedir();
  return path.join(homedir, '.backport', 'repositories', owner, repoName);
};

module.exports = {
  getGlobalConfigPath,
  getReposPath,
  getRepoOwnerPath,
  getRepoPath
};
