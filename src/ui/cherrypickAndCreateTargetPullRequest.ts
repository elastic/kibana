import chalk from 'chalk';
import dedent = require('dedent');
import isEmpty = require('lodash.isempty');
import ora = require('ora');
import { BackportOptions } from '../options/options';
import { HandledError } from '../services/HandledError';
import { exec } from '../services/child-process-promisified';
import { getRepoPath } from '../services/env';
import {
  cherrypick,
  createBackportBranch,
  deleteBackportBranch,
  pushBackportBranch,
  setCommitAuthor,
  getUnmergedFiles,
  addUnstagedFiles,
  finalizeCherrypick,
  getFilesWithConflicts,
} from '../services/git';
import { getShortSha } from '../services/github/commitFormatters';
import { addAssigneesToPullRequest } from '../services/github/v3/addAssigneesToPullRequest';
import { addLabelsToPullRequest } from '../services/github/v3/addLabelsToPullRequest';
import { createPullRequest } from '../services/github/v3/createPullRequest';
import { consoleLog, logger } from '../services/logger';
import { confirmPrompt } from '../services/prompts';
import { sequentially } from '../services/sequentially';
import { CommitSelected } from '../types/Commit';

export async function cherrypickAndCreateTargetPullRequest({
  options,
  commits,
  targetBranch,
}: {
  options: BackportOptions;
  commits: CommitSelected[];
  targetBranch: string;
}) {
  const backportBranch = getBackportBranch(targetBranch, commits);
  consoleLog(`\n${chalk.bold(`Backporting to ${targetBranch}:`)}`);

  await createBackportBranch({ options, targetBranch, backportBranch });
  await sequentially(commits, (commit) => waitForCherrypick(options, commit));

  if (options.resetAuthor) {
    await setCommitAuthor(options, options.username);
  }

  await pushBackportBranch({ options, backportBranch });
  await deleteBackportBranch({ options, backportBranch });

  const targetPullRequest = await createPullRequest({
    options,
    commits,
    targetBranch,
    backportBranch,
  });

  // add assignees to target pull request
  if (options.assignees.length > 0) {
    await addAssigneesToPullRequest(
      options,
      targetPullRequest.number,
      options.assignees
    );
  }

  // add labels to target pull request
  if (options.targetPRLabels.length > 0) {
    await addLabelsToPullRequest(
      options,
      targetPullRequest.number,
      options.targetPRLabels
    );
  }

  // add labels to source pull requests
  if (options.sourcePRLabels.length > 0) {
    const promises = commits.map((commit) => {
      if (commit.pullNumber) {
        return addLabelsToPullRequest(
          options,
          commit.pullNumber,
          options.sourcePRLabels
        );
      }
    });
    await Promise.all(promises);
  }

  consoleLog(`View pull request: ${targetPullRequest.html_url}`);

  return targetPullRequest;
}

/*
 * Returns the name of the backport brancha
 *
 * Examples:
 * For a single PR: `backport/7.x/pr-1234`
 * For a single commit: `backport/7.x/commit-abcdef`
 * For multiple: `backport/7.x/pr-1234_commit-abcdef`
 */
export function getBackportBranch(
  targetBranch: string,
  commits: CommitSelected[]
) {
  const refValues = commits
    .map((commit) =>
      commit.pullNumber
        ? `pr-${commit.pullNumber}`
        : `commit-${getShortSha(commit.sha)}`
    )
    .join('_')
    .slice(0, 200);
  return `backport/${targetBranch}/${refValues}`;
}

async function waitForCherrypick(
  options: BackportOptions,
  commit: CommitSelected
) {
  const spinnerText = `Cherry-picking: ${chalk.greenBright(
    commit.formattedMessage
  )}`;
  const cherrypickSpinner = ora(spinnerText).start();

  if (options.dryRun) {
    cherrypickSpinner.succeed(`Dry run: ${spinnerText}`);
    return;
  }

  try {
    const { needsResolving } = await cherrypick(options, commit);

    // no conflicts encountered
    if (!needsResolving) {
      cherrypickSpinner.succeed();
      return;
    }

    // cherrypick failed due to conflicts
    cherrypickSpinner.fail();
  } catch (e) {
    cherrypickSpinner.fail();
    throw e;
  }

  // resolve conflicts automatically
  if (options.autoFixConflicts) {
    const autoResolveSpinner = ora(
      'Attempting to resolve conflicts automatically'
    ).start();

    const filesWithConflicts = await getFilesWithConflicts(options);
    const repoPath = getRepoPath(options);
    const didAutoFix = await options.autoFixConflicts({
      files: filesWithConflicts,
      directory: repoPath,
      logger,
    });

    // conflicts were automatically resolved
    if (didAutoFix) {
      autoResolveSpinner.succeed();
      return;
    }
    autoResolveSpinner.fail();
  }

  /*
   * Commit could not be cleanly cherrypicked: Initiating conflict resolution
   */

  if (options.editor) {
    const repoPath = getRepoPath(options);
    await exec(`${options.editor} ${repoPath}`, {});
  }

  // list files with conflict markers and require user to resolve them
  await listConflictingFiles(options);

  // list unmerged files and require user to confirm adding+comitting them
  await listUnstagedFiles(options);

  // Conflicts resolved and unstaged files will now be staged and committed
  const stagingSpinner = ora(`Finalizing cherrypick`).start();
  try {
    // add unstaged files
    await addUnstagedFiles(options);

    // Run `git commit`
    await finalizeCherrypick(options);
    stagingSpinner.succeed();
  } catch (e) {
    stagingSpinner.fail();
    throw e;
  }
}

async function listConflictingFiles(options: BackportOptions) {
  const checkForConflicts = async (): Promise<void> => {
    const filesWithConflicts = await getFilesWithConflicts(options);

    if (isEmpty(filesWithConflicts)) {
      return;
    }

    consoleLog(''); // linebreak
    const res = await confirmPrompt(
      dedent(`
        ${chalk.reset(
          `The following files from ${getRepoPath(options)} have conflicts:`
        )}
        ${chalk.reset(
          filesWithConflicts.map((file) => ` - ${file}`).join('\n')
        )}

        ${chalk.reset.italic(
          'You do not need to `git add` or `git commit` the files - simply fix the conflicts.'
        )}

        Press ENTER when the conflicts are resolved
      `)
    );
    if (!res) {
      throw new HandledError('Aborted');
    }

    await checkForConflicts();
  };

  await checkForConflicts();
}

async function listUnstagedFiles(options: BackportOptions) {
  const unmergedFiles = await getUnmergedFiles(options);

  if (isEmpty(unmergedFiles)) {
    return;
  }

  consoleLog(''); // linebreak
  const res = await confirmPrompt(
    dedent(`
      ${chalk.reset(`The following files are unstaged:`)}
      ${chalk.reset(unmergedFiles.map((file) => ` - ${file}`).join('\n'))}



      Press ENTER to stage them
    `)
  );
  if (!res) {
    throw new HandledError('Aborted');
  }
  consoleLog(''); // linebreak
}
