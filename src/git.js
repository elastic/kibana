const promisify = require('es6-promisify');
const Git = require('nodegit');
const process = require('child_process');
const exec = promisify(process.exec);
const { githubUsername } = require('../config.json');

const authCallbacks = {
  certificateCheck: () => 1,
  credentials: (url, username) => Git.Cred.sshKeyFromAgent(username)
};

function openRepo(repoName) {
  return Git.Repository.open(`./repos/${repoName}`);
}

function cloneRepo(repoName) {
  return Git.Clone(`git@github.com:elastic/${repoName}`, repoName, {
    fetchOpts: {
      callbacks: authCallbacks
    }
  });
}

function resetHard(repo) {
  return repo.getHeadCommit().then(head => Git.Reset.reset(repo, head, 3));
}

function cherrypick(repoName, sha) {
  return exec(`git cherry-pick ${sha}`, { cwd: `./repos/${repoName}` });
}

function createAndCheckoutBranch(repo, baseBranch, featureBranch) {
  const force = true;
  return repo
    .getBranchCommit(`refs/remotes/origin/${baseBranch}`)
    .then(headCommit => repo.createBranch(featureBranch, headCommit, force))
    .then(() => repo.checkoutBranch(featureBranch));
}

function push(repo, backportBranchName) {
  return Git.Remote.lookup(repo, githubUsername).then(function(remote) {
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
