const ora = require('ora');
const chalk = require('chalk');
const isEmpty = require('lodash.isempty');

const prompts = require('../lib/prompts');
const github = require('../lib/github');
const {
  ERROR_CODES,
  MissingDataError,
  AbortApplicationError
} = require('../lib/errors');
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
  return sequentially(branches, async branch => {
    try {
      const commitsWithPullRequest = await withPullRequest(
        owner,
        repoName,
        commits
      );
      const res = await doBackportVersion({
        owner,
        repoName,
        commits: commitsWithPullRequest,
        branch,
        username,
        labels
      });
      logger.log(`View pull request: ${res.data.html_url}\n`);
    } catch (e) {
      handleErrors(e);
    }
  });
}

async function doBackportVersion({
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

  await withSpinner({ text: 'Pulling latest changes' }, async () => {
    await resetAndPullMaster(owner, repoName);
    await createAndCheckoutBranch(owner, repoName, branch, backportBranchName);
  });

  await sequentially(commits, commit =>
    cherrypickAndConfirm(owner, repoName, commit.sha)
  );

  await withSpinner(
    { text: `Pushing branch ${username}:${backportBranchName}` },
    () => push(owner, repoName, username, backportBranchName)
  );

  return withSpinner({ text: 'Creating pull request' }, async () => {
    const payload = await getPullRequestPayload(branch, commits, username);
    const res = await github.createPullRequest(owner, repoName, payload);
    if (labels.length > 0) {
      await github.addLabels(owner, repoName, res.data.number, labels);
    }
    return res;
  });
}

// Add pull request info to commit if it exists
function withPullRequest(owner, repoName, commits) {
  const promise = Promise.all(
    commits.map(async commit => {
      const pullRequest = await github.getPullRequestByCommit(
        owner,
        repoName,
        commit.sha
      );
      return { ...commit, pullRequest };
    })
  );
  return withSpinner({}, () => promise);
}

async function maybeSetupRepo(owner, repoName, username) {
  if (await repoExists(owner, repoName)) {
    return null;
  }

  return withSpinner(
    { text: 'Cloning repository (may take a few minutes the first time)' },
    () => setupRepo(owner, repoName, username)
  );
}

async function getCommitBySha({ owner, repoName, sha }) {
  const spinner = ora().start();
  try {
    const commit = await github.getCommit(owner, repoName, sha);
    spinner.stopAndPersist({
      symbol: chalk.green('?'),
      text: `${chalk.bold('Select commit')} ${chalk.cyan(commit.message)}`
    });
    return [commit];
  } catch (e) {
    spinner.stop();
    throw e;
  }
}

async function getCommitByPrompt({ owner, repoName, author, multipleCommits }) {
  const spinner = ora('Loading commits...').start();
  try {
    const commits = await github.getCommits(owner, repoName, author);
    if (isEmpty(commits)) {
      spinner.stopAndPersist({
        symbol: chalk.green('?'),
        text: `${chalk.bold('Select commit')} `
      });

      throw new MissingDataError(
        chalk.red(
          author
            ? 'There are no commits by you in this repository'
            : 'There are no commits in this repository'
        )
      );
    }
    spinner.stop();
    return prompts.listCommits(commits, multipleCommits);
  } catch (e) {
    spinner.fail();
    throw e;
  }
}

function getBranchesByPrompt(branches, isMultipleChoice = false) {
  return prompts.listBranches(branches, isMultipleChoice);
}

function handleErrors(e) {
  switch (e.code) {
    // Handled exceptions
    case ERROR_CODES.ABORT_APPLICATION_ERROR_CODE:
    case ERROR_CODES.GITHUB_API_ERROR_CODE:
    case ERROR_CODES.GITHUB_SSH_ERROR_CODE:
    case ERROR_CODES.MISSING_DATA_ERROR_CODE:
      logger.error(e.message);
      break;

    // Unhandled exceptions
    default:
      logger.error(e);
  }
}

function sequentially(items, handler) {
  return items.reduce(async (p, item) => {
    await p;
    return handler(item);
  }, Promise.resolve());
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

async function cherrypickAndConfirm(owner, repoName, sha) {
  try {
    await withSpinner(
      {
        text: 'Cherry-picking commit',
        errorText: `Cherry-picking failed. Please resolve conflicts in: ${getRepoPath(
          owner,
          repoName
        )}`
      },
      () => cherrypick(owner, repoName, sha)
    );
  } catch (e) {
    if (!isCherrypickConflict(e)) {
      throw e;
    }

    await confirmResolvedRecursive(owner, repoName);
  }
}

async function confirmResolvedRecursive(owner, repoName) {
  const res = await prompts.confirmConflictResolved();
  if (!res) {
    throw new AbortApplicationError('Application was aborted.');
  }

  const isDirty = isIndexDirty(owner, repoName);
  if (isDirty) {
    await confirmResolvedRecursive(owner, repoName);
  }
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

async function withSpinner({ text, errorText }, fn) {
  const spinner = ora(text).start();

  try {
    const res = await fn();
    if (text) {
      spinner.succeed();
    } else {
      spinner.stop();
    }

    return res;
  } catch (e) {
    if (errorText) {
      spinner.text = errorText;
    }
    spinner.fail();
    throw e;
  }
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
