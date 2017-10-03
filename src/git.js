const promisify = require('es6-promisify');
const fs = require('fs');
const Git = require('nodegit');
const stat = promisify(fs.stat);
const { getRepoPath } = require('./env');
const constants = require('./constants');

function withAuthentication() {
  return {
    callbacks: {
      certificateCheck: () => 1,
      credentials: (url, username) => Git.Cred.sshKeyFromAgent(username)
    }
  };
}

function openRepo(owner, repoName) {
  return Git.Repository.open(getRepoPath(owner, repoName));
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

// Clone repo and add remotes if it does not exist
function maybeSetupRepo(owner, repoName, username) {
  return folderExists(getRepoPath(owner, repoName)).then(exists => {
    if (!exists) {
      return cloneRepo(owner, repoName).then(repo =>
        addRemote(repo, username, repoName)
      );
    }
  });
}

function getRemoteUrl(owner, repoName) {
  return `git@github.com:${owner}/${repoName}`;
}

function cloneRepo(owner, repoName) {
  return Git.Clone(
    getRemoteUrl(owner, repoName),
    getRepoPath(owner, repoName),
    {
      fetchOpts: withAuthentication()
    }
  );
}

function addRemote(repo, username, repoName) {
  return Git.Remote.create(repo, username, getRemoteUrl(username, repoName));
}

function resetHard(repo) {
  const RESET_HARD = 3;
  return repo
    .getHeadCommit()
    .then(head => Git.Reset.reset(repo, head, RESET_HARD));
}

function cherrypick(repo, sha) {
  return Git.Commit.lookup(repo, sha).then(cherrypickCommit => {
    return Git.Cherrypick
      .cherrypick(repo, cherrypickCommit, {})
      .then(() => repo.index())
      .then(index => {
        if (index.hasConflicts() > 0) {
          throw new Error(constants.CHERRYPICK_CONFLICT);
        }
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

function push(repo, branchName, username) {
  return Git.Remote.lookup(repo, username).then(remote => {
    return remote.push(
      [`refs/heads/${branchName}:refs/heads/${branchName}`],
      withAuthentication()
    );
  });
}

function pull(repo, branchName) {
  return repo
    .fetchAll(withAuthentication())
    .then(() => repo.mergeBranches(branchName, `origin/${branchName}`));
}

function checkoutAndPull(repo, branchName) {
  return repo.checkoutBranch(branchName).then(() => pull(repo, branchName));
}

function getCommit(repo, sha) {
  return repo.getCommit(sha);
}

module.exports = {
  addRemote,
  checkoutAndPull,
  cherrypick,
  cloneRepo,
  createAndCheckoutBranch,
  getCommit,
  maybeSetupRepo,
  openRepo,
  pull,
  push,
  resetHard
};
