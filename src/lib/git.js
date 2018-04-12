const env = require('./env');
const rpc = require('./rpc');
const { GithubSSHError } = require('./errors');

async function folderExists(path) {
  try {
    const stats = await rpc.stat(path);
    return stats.isDirectory();
  } catch (e) {
    if (e.code === 'ENOENT') {
      return false;
    }

    throw e;
  }
}

function repoExists(owner, repoName) {
  return folderExists(env.getRepoPath(owner, repoName));
}

// Clone repo and add remotes
async function setupRepo(owner, repoName, username) {
  await verifyGithubSshAuth();
  await rpc.mkdirp(env.getRepoOwnerPath(owner));
  await cloneRepo(owner, repoName);
  return addRemote(owner, repoName, username);
}

function getRemoteUrl(owner, repoName) {
  return `git@github.com:${owner}/${repoName}`;
}

function cloneRepo(owner, repoName) {
  return rpc.exec(`git clone ${getRemoteUrl(owner, repoName)}`, {
    cwd: env.getRepoOwnerPath(owner)
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

// TODO: rewrite to async/await
function isIndexDirty(owner, repoName) {
  return rpc
    .exec(`git diff-index --quiet HEAD --`, {
      cwd: env.getRepoPath(owner, repoName)
    })
    .then(() => false)
    .catch(() => true);
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

async function resetAndPullMaster(owner, repoName) {
  return rpc.exec(
    `git reset --hard && git clean -d --force && git checkout master && git pull origin master`,
    {
      cwd: env.getRepoPath(owner, repoName)
    }
  );
}

async function verifyGithubSshAuth() {
  try {
    await rpc.exec(`ssh -oBatchMode=yes -T git@github.com`);
    return true;
  } catch (e) {
    switch (e.code) {
      case 1:
        return true;
      case 255:
        if (e.stderr.includes('Host key verification failed.')) {
          throw new GithubSSHError(
            'Host verification of github.com failed. To automatically add it to .ssh/known_hosts run:\nssh -T git@github.com'
          );
        } else if (e.stderr.includes('Permission denied')) {
          throw new GithubSSHError(
            'Permission denied. Please add your ssh private key to the keychain by following these steps:\nhttps://help.github.com/articles/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent/#adding-your-ssh-key-to-the-ssh-agent'
          );
        } else {
          throw e;
        }

      default:
        throw e;
    }
  }
}

module.exports = {
  verifyGithubSshAuth,
  cherrypick,
  cloneRepo,
  createAndCheckoutBranch,
  isIndexDirty,
  push,
  repoExists,
  resetAndPullMaster,
  setupRepo
};
