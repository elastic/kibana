import ora from 'ora';
import { confirmPrompt } from '../services/prompts';
import {
  addLabelsToPullRequest,
  createPullRequest,
  Commit,
  getShortSha
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
import { BackportOptions } from '../options/options';

export function doBackportVersions(
  options: BackportOptions,
  commits: Commit[],
  branches: string[]
) {
  return sequentially(branches, async baseBranch => {
    try {
      const pullRequest = await doBackportVersion(options, {
        commits,
        baseBranch
      });
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
  options: BackportOptions,
  {
    commits,
    baseBranch
  }: {
    commits: Commit[];
    baseBranch: string;
  }
) {
  const featureBranch = getFeatureBranchName(baseBranch, commits);
  const refValues = commits.map(commit => getReferenceLong(commit)).join(', ');
  log(`Backporting ${refValues} to ${baseBranch}:`);

  await withSpinner({ text: 'Pulling latest changes' }, async () => {
    await resetAndPullMaster(options);
    await createAndCheckoutBranch(options, baseBranch, featureBranch);
  });

  await sequentially(commits, commit =>
    cherrypickAndConfirm(options, commit.sha)
  );

  await withSpinner(
    { text: `Pushing branch ${options.username}:${featureBranch}` },
    () => push(options, featureBranch)
  );

  return withSpinner({ text: 'Creating pull request' }, async () => {
    const payload = getPullRequestPayload(options, baseBranch, commits);
    const pullRequest = await createPullRequest(options, payload);
    if (options.labels.length > 0) {
      await addLabelsToPullRequest(options, pullRequest.number);
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

export function getReferenceLong(commit: Commit) {
  return commit.pullNumber ? `#${commit.pullNumber}` : getShortSha(commit.sha);
}

function getReferenceShort(commit: Commit) {
  return commit.pullNumber
    ? `pr-${commit.pullNumber}`
    : `commit-${getShortSha(commit.sha)}`;
}

async function cherrypickAndConfirm(options: BackportOptions, sha: string) {
  const spinner = ora(`Cherry-picking commit ${getShortSha(sha)}`).start();
  try {
    await cherrypick(options, sha);
    spinner.succeed();
  } catch (e) {
    spinner.fail(`Cherry-picking failed.\n`);
    log(
      `Please resolve conflicts in: ${getRepoPath(
        options
      )} and when all conflicts have been resolved and staged run:`
    );
    log(`
    git cherry-pick --continue
    `);

    const hasConflict = e.cmd.includes('git cherry-pick');
    if (!hasConflict) {
      throw e;
    }

    await resolveConflictsOrAbort(options);
  }
}

async function resolveConflictsOrAbort(options: BackportOptions) {
  const res = await confirmPrompt(
    'Press enter when you have commited all changes'
  );
  if (!res) {
    throw new HandledError('Aborted');
  }

  const isDirty = await isIndexDirty(options);
  if (isDirty) {
    await resolveConflictsOrAbort(options);
  }
}

function getPullRequestTitle(
  baseBranch: string,
  commits: Commit[],
  prTitle: string
) {
  const commitMessages = commits
    .map(commit => commit.message)
    .join(' | ')
    .slice(0, 200);

  // prTitle could include baseBranch or commitMessages in template literal
  return prTitle
    .replace('{baseBranch}', baseBranch)
    .replace('{commitMessages}', commitMessages);
}

export function getPullRequestPayload(
  { prDescription, prTitle, username }: BackportOptions,
  baseBranch: string,
  commits: Commit[]
) {
  const featureBranch = getFeatureBranchName(baseBranch, commits);
  const commitRefs = commits
    .map(commit => {
      const ref = getReferenceLong(commit);
      return ` - ${commit.message.replace(`(${ref})`, '')} (${ref})`;
    })
    .join('\n');

  const bodySuffix = prDescription ? `\n\n${prDescription}` : '';

  return {
    title: getPullRequestTitle(baseBranch, commits, prTitle),
    body: `Backports the following commits to ${baseBranch}:\n${commitRefs}${bodySuffix}`,
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
