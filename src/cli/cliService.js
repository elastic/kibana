const ora = require('ora');
const chalk = require('chalk');

const prompts = require('../lib/prompts');
const github = require('../lib/github');
const constants = require('../lib/constants');
const { getRepoPath } = require('../lib/env');
const logger = require('../lib/logger');

const {
  resetAndPullMaster,
  cherrypick,
  createAndCheckoutBranch,
  push,
  repoExists,
  setupRepo,
  isIndexDirty
} = require('../lib/git');

function doBackportVersions({
  owner,
  repoName,
  commits,
  branches,
  username,
  labels
}) {
  return sequentially(branches, branch => {
    return withPullRequest(owner, repoName, commits)
      .then(commitsWithPullRequest => {
        return doBackportVersion({
          owner,
          repoName,
          commits: commitsWithPullRequest,
          branch,
          username,
          labels
        });
      })
      .then(res => logger.log(`View pull request: ${res.data.html_url}\n`))
      .catch(handleErrors);
  });
}

function doBackportVersion({
  owner,
  repoName,
  commits,
  branch,
  username,
  labels = []
}) {
  const backportBranchName = getBackportBranchName(branch, commits);
  const refValues = commits.map(commit => getReferenceLong(commit)).join(', ');
  logger.log(`Backporting ${refValues} to ${branch}`);

  return withSpinner(
    resetAndPullMaster(owner, repoName).then(() =>
      createAndCheckoutBranch(owner, repoName, branch, backportBranchName)
    ),
    'Pulling latest changes'
  )
    .then(() =>
      sequentially(commits, commit =>
        cherrypickAndConfirm(owner, repoName, commit.sha)
      )
    )
    .then(() =>
      withSpinner(
        push(owner, repoName, username, backportBranchName),
        `Pushing branch ${username}:${backportBranchName}`
      )
    )
    .then(() => {
      const payload = getPullRequestPayload(branch, commits, username);
      const promise = github
        .createPullRequest(owner, repoName, payload)
        .then(res => {
          if (labels.length > 0) {
            return github
              .addLabels(owner, repoName, res.data.number, labels)
              .then(() => res);
          }
          return res;
        });

      return withSpinner(promise, 'Creating pull request');
    });
}

// Add pull request info to commit if it exists
function withPullRequest(owner, repoName, commits) {
  const promise = Promise.all(
    commits.map(commit => {
      return github
        .getPullRequestByCommit(owner, repoName, commit.sha)
        .then(pullRequest => Object.assign({}, commit, { pullRequest }));
    })
  );
  return withSpinner(promise);
}

function maybeSetupRepo(owner, repoName, username) {
  return repoExists(owner, repoName).then(exists => {
    if (exists) {
      return null;
    }

    return withSpinner(
      setupRepo(owner, repoName, username),
      'Cloning repository (may take a few minutes the first time)'
    );
  });
}

function getCommitBySha({ owner, repoName, sha }) {
  const spinner = ora().start();
  return github
    .getCommit(owner, repoName, sha)
    .catch(e => {
      spinner.stop();
      throw e;
    })
    .then(commit => {
      spinner.stopAndPersist({
        symbol: chalk.green('?'),
        text: `${chalk.bold('Select commit')} ${chalk.cyan(commit.message)}`
      });
      return [commit];
    });
}

function getCommitByPrompt({ owner, repoName, author, multipleCommits }) {
  const spinner = ora('Loading commits...').start();
  return github
    .getCommits(owner, repoName, author)
    .catch(e => {
      spinner.fail();
      throw e;
    })
    .then(commits => {
      spinner.stop();
      return prompts.listCommits(commits, multipleCommits);
    });
}

function getBranchesByPrompt(branches, isMultipleChoice = false) {
  return prompts.listBranches(branches, isMultipleChoice);
}

function handleErrors(e) {
  switch (e.code) {
    // Handled exceptions
    case constants.GITHUB_ERROR:
      logger.error(JSON.stringify(e.message, null, 4));
      break;

    // Unhandled exceptions
    default:
      logger.error(e);
  }
}

function sequentially(items, handler) {
  return items.reduce(
    (p, item) => p.then(() => handler(item)),
    Promise.resolve()
  );
}

function getBackportBranchName(branch, commits) {
  const refValues = commits
    .map(commit => getReferenceShort(commit))
    .join('_')
    .slice(0, 200);
  return `backport/${branch}/${refValues}`;
}

function getReference(commit, { short }) {
  if (commit.pullRequest) {
    return short ? `pr-${commit.pullRequest}` : `#${commit.pullRequest}`;
  }

  const shortCommit = commit.sha.slice(0, 7);
  return short ? `commit-${shortCommit}` : `${shortCommit}`;
}

function getReferenceLong(commit) {
  return getReference(commit, { short: false });
}

function getReferenceShort(commit) {
  return getReference(commit, { short: true });
}

function isCherrypickConflict(e) {
  return e.cmd.includes('git cherry-pick');
}

function cherrypickAndConfirm(owner, repoName, sha) {
  return withSpinner(
    cherrypick(owner, repoName, sha),
    'Cherry-picking commit',
    `Cherry-picking failed. Please resolve conflicts in: ${getRepoPath(
      owner,
      repoName
    )}`
  ).catch(e => {
    if (!isCherrypickConflict(e)) {
      throw e;
    }

    return confirmResolvedRecursive(owner, repoName);
  });
}

function confirmResolvedRecursive(owner, repoName) {
  return prompts
    .confirmConflictResolved()
    .then(() => isIndexDirty(owner, repoName))
    .then(
      isDirty => (isDirty ? confirmResolvedRecursive(owner, repoName) : null)
    );
}

function getPullRequestPayload(branch, commits, username) {
  const backportBranchName = getBackportBranchName(branch, commits);
  const commitRefs = commits
    .map(commit => {
      const ref = getReferenceLong(commit);
      return ` - ${commit.message.replace(`(${ref})`, '')} (${ref})`;
    })
    .join('\n');

  const commitMessages = commits
    .map(commit => commit.message)
    .join(' | ')
    .slice(0, 200);

  return {
    title: `[${branch}] ${commitMessages}`,
    body: `Backports the following commits to ${branch}:\n${commitRefs}`,
    head: `${username}:${backportBranchName}`,
    base: `${branch}`
  };
}

function withSpinner(promise, text, errorText) {
  const spinner = ora(text).start();
  return promise
    .then(res => {
      if (text) {
        spinner.succeed();
      } else {
        spinner.stop();
      }
      return res;
    })
    .catch(e => {
      if (errorText) {
        spinner.text = errorText;
      }
      spinner.fail();
      throw e;
    });
}

module.exports = {
  doBackportVersion,
  doBackportVersions,
  getCommitBySha,
  getReferenceLong,
  handleErrors,
  maybeSetupRepo,
  getCommitByPrompt,
  getBranchesByPrompt,
  withPullRequest
};
