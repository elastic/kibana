import ora from 'ora';
import { confirmPrompt } from '../services/prompts';
import {
  addLabelsToPullRequest,
  createPullRequest,
  Commit
} from '../services/github';
import { HandledError } from '../services/HandledError';
import { getRepoPath } from '../services/env';
import { log } from '../services/logger';
import {
  cherrypick,
  createAndCheckoutBranch,
  isIndexDirty,
  push,
  resetAndPullMaster
} from '../services/git';

export function doBackportVersions(
  owner: string,
  repoName: string,
  commits: Commit[],
  branches: string[],
  username: string,
  labels: string[]
) {
  return sequentially(branches, async branch => {
    try {
      const pullRequest = await doBackportVersion(
        owner,
        repoName,
        commits,
        branch,
        username,
        labels
      );
      log(`View pull request: ${pullRequest.html_url}`);
    } catch (e) {
      if (e.name === 'HandledError') {
        console.error(e.message);
      } else {
        console.error(e);
        throw e;
      }
    }
  });
}

export async function doBackportVersion(
  owner: string,
  repoName: string,
  commits: Commit[],
  baseBranch: string,
  username: string,
  labels: string[] = []
) {
  const featureBranch = getFeatureBranchName(baseBranch, commits);
  const refValues = commits.map(commit => getReferenceLong(commit)).join(', ');
  log(`Backporting ${refValues} to ${baseBranch}:`);

  await withSpinner({ text: 'Pulling latest changes' }, async () => {
    await resetAndPullMaster({ owner, repoName });
    await createAndCheckoutBranch({
      owner,
      repoName,
      baseBranch: baseBranch,
      featureBranch: featureBranch
    });
  });

  await sequentially(commits, commit =>
    cherrypickAndConfirm(owner, repoName, commit.sha)
  );

  await withSpinner(
    { text: `Pushing branch ${username}:${featureBranch}` },
    () =>
      push({
        owner,
        repoName,
        remoteName: username,
        branchName: featureBranch
      })
  );

  return withSpinner({ text: 'Creating pull request' }, async () => {
    const payload = getPullRequestPayload(baseBranch, commits, username);
    const pullRequest = await createPullRequest(owner, repoName, payload);
    if (labels.length > 0) {
      await addLabelsToPullRequest(owner, repoName, pullRequest.number, labels);
    }
    return pullRequest;
  });
}

function sequentially<T>(items: T[], handler: (item: T) => Promise<void>) {
  return items.reduce(async (p, item) => {
    await p;
    return handler(item);
  }, Promise.resolve());
}

function getFeatureBranchName(baseBranch: string, commits: Commit[]) {
  const refValues = commits
    .map(commit => getReferenceShort(commit))
    .join('_')
    .slice(0, 200);
  return `backport/${baseBranch}/${refValues}`;
}

function getShortSha(commit: Commit) {
  return commit.sha.slice(0, 7);
}

export function getReferenceLong(commit: Commit) {
  return commit.pullNumber ? `#${commit.pullNumber}` : getShortSha(commit);
}

function getReferenceShort(commit: Commit) {
  return commit.pullNumber
    ? `pr-${commit.pullNumber}`
    : `commit-${getShortSha(commit)}`;
}

async function cherrypickAndConfirm(
  owner: string,
  repoName: string,
  sha: string
) {
  const spinner = ora(`Cherry-picking commit ${sha}`).start();
  try {
    await cherrypick({ owner, repoName, sha });
    spinner.succeed();
  } catch (e) {
    spinner.fail(`Cherry-picking failed.\n`);
    log(
      `Please resolve conflicts in: ${getRepoPath(
        owner,
        repoName
      )} and when all conflicts have been resolved and staged run:`
    );
    log(`
    git cherry-pick --continue
    `);

    const hasConflict = e.cmd.includes('git cherry-pick');
    if (!hasConflict) {
      throw e;
    }

    await resolveConflictsOrAbort(owner, repoName);
  }
}

async function resolveConflictsOrAbort(owner: string, repoName: string) {
  const res = await confirmPrompt(
    'Press enter when you have commited all changes'
  );
  if (!res) {
    throw new HandledError('Aborted');
  }

  const isDirty = await isIndexDirty({ owner, repoName });
  if (isDirty) {
    await resolveConflictsOrAbort(owner, repoName);
  }
}

function getPullRequestTitle(baseBranch: string, commits: Commit[]) {
  const commitMessages = commits
    .map(commit => commit.message)
    .join(' | ')
    .slice(0, 200);

  return `[${baseBranch}] ${commitMessages}`;
}

export function getPullRequestPayload(
  baseBranch: string,
  commits: Commit[],
  username: string
) {
  const featureBranch = getFeatureBranchName(baseBranch, commits);
  const commitRefs = commits
    .map(commit => {
      const ref = getReferenceLong(commit);
      return ` - ${commit.message.replace(`(${ref})`, '')} (${ref})`;
    })
    .join('\n');

  return {
    title: getPullRequestTitle(baseBranch, commits),
    body: `Backports the following commits to ${baseBranch}:\n${commitRefs}`,
    head: `${username}:${featureBranch}`,
    base: `${baseBranch}`
  };
}

async function withSpinner<T>(
  { text }: { text: string },
  fn: () => Promise<T>
): Promise<T> {
  const spinner = ora(text).start();

  try {
    const res = await fn();
    spinner.succeed();
    return res;
  } catch (e) {
    spinner.fail();
    throw e;
  }
}
