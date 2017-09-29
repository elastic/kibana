const promisify = require('es6-promisify');
const fs = require('fs');
const Git = require('nodegit');
const stat = promisify(fs.stat);
const { getConfig, getRepoPath } = require('./configs');
const constants = require('./constants');
const { username } = getConfig();

function withAuthentication() {
  return {
    callbacks: {
      certificateCheck: () => 1,
      credentials: (url, username) => Git.Cred.sshKeyFromAgent(username)
    }
  };
}

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
      return cloneRepo(repoName).then(repo =>
        addPersonalRemote(repo, repoName)
      );
    }
  });
}

function getRemoteUrl(owner, repoName) {
  return `git@github.com:${owner}/${repoName}`;
}

function cloneRepo(repoName) {
  return Git.Clone(getRemoteUrl('elastic', repoName), getRepoPath(repoName), {
    fetchOpts: withAuthentication()
  });
}

function addPersonalRemote(repo, repoName) {
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
          throw new Error(constants.CHERRYPICK_CONFLICT);
        }
        // repo.stateCleanup();
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

function push(repo, branchName) {
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

function deleteBranch(repo, branchName) {
  return repo.getBranch(branchName).then(reference => {
    return Git.Branch.delete(reference);
  });
}

function getCommit(repo, sha) {
  return repo.getCommit(sha);
}

module.exports = {
  addPersonalRemote,
  checkoutAndPull,
  cherrypick,
  cloneRepo,
  createAndCheckoutBranch,
  deleteBranch,
  getCommit,
  maybeSetupRepo,
  openRepo,
  pull,
  push,
  resetHard
};
