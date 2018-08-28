import { Commit, BranchChoice, GithubPullRequestPayload } from '../types/types';

import chalk from 'chalk';
import isEmpty from 'lodash.isempty';
import ora from 'ora';

import {
  listCommits,
  listBranches,
  confirmConflictResolved
} from '../lib/prompts';
import {
  createPullRequest,
  addLabels,
  getCommit,
  getCommits
} from '../lib/github';
import { HandledError } from '../lib/errors';
import { getRepoPath } from '../lib/env';
import * as logger from '../lib/logger';

import {
  resetAndPullMaster,
  cherrypick,
  createAndCheckoutBranch,
  push,
  repoExists,
  deleteRepo,
  setupRepo,
  isIndexDirty,
  verifyGithubSshAuth
} from '../lib/git';

export function doBackportVersions(
  owner: string,
  repoName: string,
  commits: Commit[],
  branches: string[],
  username: string,
  labels: string[]
) {
  return sequentially(branches, async (branch: string) => {
    try {
      const pullRequest = await doBackportVersion(
        owner,
        repoName,
        commits,
        branch,
        username,
        labels
      );
      logger.log(`View pull request: ${pullRequest.html_url}\n`);
    } catch (e) {
      handleErrors(e);
    }
  });
}

export function handleErrors(e: Error) {
  switch (e.name) {
    // Handled exceptions
    case 'HandledError':
      console.error(e.message);
      break;

    // Unhandled exceptions
    default:
      console.error(e);
      throw e;
  }
}

export async function doBackportVersion(
  owner: string,
  repoName: string,
  commits: Commit[],
  branch: string,
  username: string,
  labels: string[] = []
) {
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
    const payload = getPullRequestPayload(branch, commits, username);
    const pullRequest = await createPullRequest(owner, repoName, payload);
    if (labels.length > 0) {
      await addLabels(owner, repoName, pullRequest.number, labels);
    }
    return pullRequest;
  });
}

export async function maybeSetupRepo(
  owner: string,
  repoName: string,
  username: string
) {
  await verifyGithubSshAuth();

  if (await repoExists(owner, repoName)) {
    return;
  }

  const text = 'Cloning repository (only first time)';
  const spinner = ora(`0% ${text}`).start();

  try {
    await setupRepo(owner, repoName, username, (progress: string) => {
      spinner.text = `${progress}% ${text}`;
    });
    spinner.succeed();
  } catch (e) {
    spinner.stop();
    await deleteRepo(owner, repoName);
    throw e;
  }
}

export async function getCommitBySha(
  owner: string,
  repoName: string,
  sha: string
) {
  const spinner = ora().start();
  try {
    const commit = await getCommit(owner, repoName, sha);
    spinner.stopAndPersist({
      symbol: chalk.green('?'),
      text: `${chalk.bold('Select commit')} ${chalk.cyan(commit.message)}`
    });
    return commit;
  } catch (e) {
    spinner.stop();
    throw e;
  }
}

export async function getCommitsByPrompt(
  owner: string,
  repoName: string,
  author: string | null,
  multipleCommits: boolean
) {
  const spinner = ora('Loading commits...').start();
  try {
    const commits = await getCommits(owner, repoName, author);
    if (isEmpty(commits)) {
      spinner.stopAndPersist({
        symbol: chalk.green('?'),
        text: `${chalk.bold('Select commit')} `
      });

      throw new HandledError(
        chalk.red(
          author
            ? 'There are no commits by you in this repository'
            : 'There are no commits in this repository'
        )
      );
    }
    spinner.stop();
    return listCommits(commits, multipleCommits);
  } catch (e) {
    spinner.fail();
    throw e;
  }
}

export function getBranchesByPrompt(
  branches: BranchChoice[],
  isMultipleChoice = false
) {
  return listBranches(branches, isMultipleChoice);
}

function sequentially<T>(items: T[], handler: (item: T) => Promise<any>) {
  return items.reduce(async (p, item) => {
    await p;
    return handler(item);
  }, Promise.resolve());
}

function getBackportBranchName(branch: string, commits: Commit[]) {
  const refValues = commits
    .map(commit => getReferenceShort(commit))
    .join('_')
    .slice(0, 200);
  return `backport/${branch}/${refValues}`;
}

function getShortSha(commit: Commit) {
  return commit.sha.slice(0, 7);
}

export function getReferenceLong(commit: Commit) {
  return commit.pullRequest ? `#${commit.pullRequest}` : getShortSha(commit);
}

function getReferenceShort(commit: Commit) {
  return commit.pullRequest
    ? `pr-${commit.pullRequest}`
    : `commit-${getShortSha(commit)}`;
}

async function cherrypickAndConfirm(
  owner: string,
  repoName: string,
  sha: string
) {
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
    const hasConflict = e.cmd.includes('git cherry-pick');
    if (!hasConflict) {
      throw e;
    }

    await confirmResolvedRecursive(owner, repoName);
  }
}

async function confirmResolvedRecursive(owner: string, repoName: string) {
  const res = await confirmConflictResolved();
  if (!res) {
    throw new HandledError('Application was aborted.');
  }

  const isDirty = await isIndexDirty(owner, repoName);
  if (isDirty) {
    await confirmResolvedRecursive(owner, repoName);
  }
}

function getPullRequestTitle(branch: string, commits: Commit[]) {
  const commitMessages = commits
    .map(commit => commit.message)
    .join(' | ')
    .slice(0, 200);

  return `[${branch}] ${commitMessages}`;
}

function getPullRequestPayload(
  branch: string,
  commits: Commit[],
  username: string
): GithubPullRequestPayload {
  const backportBranchName = getBackportBranchName(branch, commits);
  const commitRefs = commits
    .map(commit => {
      const ref = getReferenceLong(commit);
      return ` - ${commit.message.replace(`(${ref})`, '')} (${ref})`;
    })
    .join('\n');

  return {
    title: getPullRequestTitle(branch, commits),
    body: `Backports the following commits to ${branch}:\n${commitRefs}`,
    head: `${username}:${backportBranchName}`,
    base: `${branch}`
  };
}

async function withSpinner<T>(
  { text, errorText }: { text?: string; errorText?: string },
  fn: () => Promise<T>
): Promise<T> {
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
