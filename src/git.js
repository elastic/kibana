const promisify = require('es6-promisify');
const fs = require('fs');
const Git = require('nodegit');
const stat = promisify(fs.stat);
const { username, getRepoPath } = require('./configs');

const authCallbacks = {
  certificateCheck: () => 1,
  credentials: (url, username) => Git.Cred.sshKeyFromAgent(username)
};

function openRepo(repoName) {
  return Git.Repository.open(getRepoPath(repoName));
}

function folderExists(path) {
  return stat(path)
    .then(stats => stats.isDirectory())
    .catch(e => {
      if (e.code === 'ENOENT') {
        return false;
      }

      throw e;
    });
}

function maybeSetupRepo(repoName) {
  return folderExists(getRepoPath(repoName)).then(exists => {
    if (!exists) {
      return cloneRepo(repoName).then(repo => addUserRemote(repo, repoName));
    }
  });
}

function getRemoteUrl(owner, repoName) {
  return `git@github.com:${owner}/${repoName}`;
}

function cloneRepo(repoName) {
  return Git.Clone(getRemoteUrl('elastic', repoName), getRepoPath(repoName), {
    fetchOpts: {
      callbacks: authCallbacks
    }
  });
}

function addUserRemote(repo, repoName) {
  return Git.Remote.create(repo, username, getRemoteUrl(username, repoName));
}

function resetHard(repo) {
  return repo.getHeadCommit().then(head => Git.Reset.reset(repo, head, 3));
}

function cherrypick(repo, sha) {
  return Git.Commit.lookup(repo, sha).then(cherrypickCommit => {
    return Git.Cherrypick
      .cherrypick(repo, cherrypickCommit, {})
      .then(() => repo.index())
      .then(index => {
        if (index.hasConflicts() > 0) {
          throw new Error('CHERRYPICK_CONFLICT');
        }
        repo.stateCleanup();
        return index.writeTree();
      })
      .then(oid => {
        return repo.getHeadCommit().then(parent => {
          return repo.createCommit(
            'HEAD',
            cherrypickCommit.author(),
            cherrypickCommit.committer(),
            cherrypickCommit.message(),
            oid,
            [parent]
          );
        });
      })
      .then(() => repo.stateCleanup());
  });
}

function createAndCheckoutBranch(repo, baseBranch, featureBranch) {
  const force = true;
  return repo
    .getBranchCommit(`refs/remotes/origin/${baseBranch}`)
    .then(headCommit => repo.createBranch(featureBranch, headCommit, force))
    .then(() => repo.checkoutBranch(featureBranch));
}

function push(repo, backportBranchName) {
  return Git.Remote.lookup(repo, username).then(function(remote) {
    return remote.push(
      [`refs/heads/${backportBranchName}:refs/heads/${backportBranchName}`],
      {
        callbacks: authCallbacks
      }
    );
  });
}

function pull(repo, branchName) {
  return repo
    .fetchAll({
      callbacks: authCallbacks
    })
    .then(() => repo.mergeBranches(branchName, `origin/${branchName}`));
}

function checkoutAndPull(repo, branchName) {
  return repo.checkoutBranch(branchName).then(() => pull(repo, branchName));
}

function deleteBranch(repo, branchName) {
  return repo.getBranch(branchName).then(reference => {
    return Git.Branch.delete(reference);
  });
}

function getCommit(repo, sha) {
  return repo.getCommit(sha);
}

module.exports = {
  addUserRemote,
  maybeSetupRepo,
  resetHard,
  checkoutAndPull,
  cherrypick,
  cloneRepo,
  createAndCheckoutBranch,
  deleteBranch,
  getCommit,
  openRepo,
  pull,
  push
};
