const env = require('./env');
const rpc = require('./rpc');

function folderExists(path) {
  return rpc
    .stat(path)
    .then(stats => stats.isDirectory())
    .catch(e => {
      if (e.code === 'ENOENT') {
        return false;
      }

      throw e;
    });
}

function repoExists(owner, repoName) {
  return folderExists(env.getRepoPath(owner, repoName));
}

// Clone repo and add remotes
function setupRepo(owner, repoName, username) {
  return rpc.mkdirp(env.getRepoOwnerDirPath(owner)).then(() => {
    return cloneRepo(owner, repoName).then(() =>
      addRemote(owner, repoName, username)
    );
  });
}

function getRemoteUrl(owner, repoName) {
  return `git@github.com:${owner}/${repoName}`;
}

function cloneRepo(owner, repoName) {
  return rpc.exec(`git clone ${getRemoteUrl(owner, repoName)}`, {
    cwd: env.getRepoOwnerDirPath(owner)
  });
}

function addRemote(owner, repoName, username) {
  return rpc.exec(
    `git remote add ${username} ${getRemoteUrl(username, repoName)}`,
    {
      cwd: env.getRepoPath(owner, repoName)
    }
  );
}

function cherrypick(owner, repoName, sha) {
  return rpc.exec(`git cherry-pick ${sha}`, {
    cwd: env.getRepoPath(owner, repoName)
  });
}

function createAndCheckoutBranch(owner, repoName, baseBranch, featureBranch) {
  return rpc.exec(
    `git fetch origin ${baseBranch} && git branch ${featureBranch} origin/${baseBranch} --force && git checkout ${featureBranch} `,
    {
      cwd: env.getRepoPath(owner, repoName)
    }
  );
}

function push(owner, repoName, username, branchName) {
  return rpc.exec(`git push ${username} ${branchName} --force`, {
    cwd: env.getRepoPath(owner, repoName)
  });
}

function resetAndPullMaster(owner, repoName) {
  return rpc.exec(
    `git reset --hard && git checkout master && git pull origin master`,
    {
      cwd: env.getRepoPath(owner, repoName)
    }
  );
}

module.exports = {
  resetAndPullMaster,
  cherrypick,
  cloneRepo,
  createAndCheckoutBranch,
  repoExists,
  setupRepo,
  push
};
