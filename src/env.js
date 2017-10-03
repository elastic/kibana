const path = require('path');
const homedir = require('os').homedir();

const env = {};

env.getBackportDirPath = () => path.join(homedir, '.backport');

env.getRepositoriesDirPath = () =>
  path.join(env.getBackportDirPath(), 'repositories');

env.getConfigFilePath = () =>
  path.join(env.getBackportDirPath(), 'config.json');

env.getRepoPath = (owner, repoName) => {
  const REPOSITORIES_DIR_PATH = env.getRepositoriesDirPath();
  return path.join(REPOSITORIES_DIR_PATH, owner, repoName);
};

module.exports = env;
