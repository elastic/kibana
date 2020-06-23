import { resolve as pathResolve } from 'path';
import del from 'del';
import isEmpty from 'lodash.isempty';
import uniq from 'lodash.uniq';
import ora from 'ora';
import { BackportOptions } from '../options/options';
import { CommitSelected } from '../types/Commit';
import { HandledError } from './HandledError';
import { execAsCallback, exec } from './child-process-promisified';
import { getRepoOwnerPath, getRepoPath } from './env';
import { stat } from './fs-promisified';
import { getShortSha } from './github/commitFormatters';
import { logger } from './logger';

async function folderExists(path: string): Promise<boolean> {
  try {
    const stats = await stat(path);
    return stats.isDirectory();
  } catch (e) {
    if (e.code === 'ENOENT') {
      return false;
    }

    throw e;
  }
}

export function repoExists(options: BackportOptions): Promise<boolean> {
  return folderExists(getRepoPath(options));
}

export function deleteRepo(options: BackportOptions) {
  const repoPath = getRepoPath(options);
  return del(repoPath);
}

export function getRemoteUrl(
  { repoName, accessToken, gitHostname }: BackportOptions,
  repoOwner: string
) {
  return `https://${accessToken}@${gitHostname}/${repoOwner}/${repoName}.git`;
}

export function cloneRepo(
  options: BackportOptions,
  callback: (progress: string) => void
) {
  return new Promise((resolve, reject) => {
    const cb = (error: any) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    };

    const execProcess = execAsCallback(
      `git clone ${getRemoteUrl(options, options.repoOwner)} --progress`,
      { cwd: getRepoOwnerPath(options), maxBuffer: 100 * 1024 * 1024 },
      cb
    );

    if (execProcess.stderr) {
      execProcess.stderr.on('data', (data) => {
        const regex = /^Receiving objects:\s+(\d+)%/;
        const [, progress]: RegExpMatchArray =
          data.toString().match(regex) || [];
        if (progress) {
          callback(progress);
        }
      });
    }
  });
}

export async function deleteRemote(
  options: BackportOptions,
  remoteName: string
) {
  try {
    await exec(`git remote rm ${remoteName}`, { cwd: getRepoPath(options) });
  } catch (e) {
    const isExecError = e.cmd && e.code === 128;
    // re-throw if error is not an exec related error
    if (!isExecError) {
      throw e;
    }
  }
}

export async function addRemote(options: BackportOptions, remoteName: string) {
  try {
    await exec(
      `git remote add ${remoteName} ${getRemoteUrl(options, remoteName)}`,
      { cwd: getRepoPath(options) }
    );
  } catch (e) {
    // note: swallowing error
    return;
  }
}

export async function cherrypick(
  options: BackportOptions,
  commit: CommitSelected
) {
  await exec(
    `git fetch ${options.repoOwner} ${commit.sourceBranch}:${commit.sourceBranch} --force`,
    { cwd: getRepoPath(options) }
  );
  const mainline =
    options.mainline != undefined ? ` --mainline ${options.mainline}` : '';

  const cmd = `git cherry-pick${mainline} ${commit.sha}`;
  try {
    await exec(cmd, { cwd: getRepoPath(options) });
    return { needsResolving: false };
  } catch (e) {
    // missing `mainline` option
    if (e.message.includes('is a merge but no -m option was given')) {
      throw new HandledError(
        'Cherrypick failed because the selected commit was a merge commit. Please try again by specifying the parent with the `mainline` argument:\n\n> backport --mainline\n\nor:\n\n> backport --mainline <parent-number>\n\nOr refer to the git documentation for more information: https://git-scm.com/docs/git-cherry-pick#Documentation/git-cherry-pick.txt---mainlineparent-number'
      );
    }

    // commit was already backported
    if (e.message.includes('The previous cherry-pick is now empty')) {
      const shortSha = getShortSha(commit.sha);
      throw new HandledError(
        `Cherrypick failed because the selected commit (${shortSha}) is empty. This is most likely caused by attemping to backporting a commit that was already backported`
      );
    }

    const isCherryPickError = e.cmd === cmd;
    const hasConflicts = !isEmpty(await getFilesWithConflicts(options));
    const hasUnmergedFiles = !isEmpty(await getUnmergedFiles(options));

    if (isCherryPickError && (hasConflicts || hasUnmergedFiles)) {
      return { needsResolving: true };
    }

    // re-throw error if there are no conflicts to solve
    throw e;
  }
}

export async function finalizeCherrypick(options: BackportOptions) {
  try {
    const noVerify = options.noVerify ? ` --no-verify` : '';

    await exec(`git commit --no-edit${noVerify}`, {
      cwd: getRepoPath(options),
    });
  } catch (e) {
    const isCommitError = e.stdout?.includes('nothing to commit');
    if (!isCommitError) {
      throw e;
    }

    logger.info(
      `git commit failed - probably because the changes were manually committed`,
      e
    );
  }
}

export async function getFilesWithConflicts(options: BackportOptions) {
  const repoPath = getRepoPath(options);
  try {
    await exec(`git --no-pager diff --check`, { cwd: repoPath });

    return [];
  } catch (e) {
    const isConflictError = e.cmd && e.code === 2;
    if (isConflictError) {
      const files = (e.stdout as string)
        .split('\n')
        .filter(
          (line: string) =>
            !!line.trim() && !line.startsWith('+') && !line.startsWith('-')
        )
        .map((line: string) => {
          const posSeparator = line.indexOf(':');
          const filename = line.slice(0, posSeparator).trim();
          return pathResolve(repoPath, filename);
        });

      return uniq(files);
    }

    // rethrow error since it's unrelated
    throw e;
  }
}

// retrieve the list of files that could not be cleanly merged
export async function getUnmergedFiles(options: BackportOptions) {
  const repoPath = getRepoPath(options);
  const res = await exec(`git --no-pager diff --name-only --diff-filter=U`, {
    cwd: repoPath,
  });
  return res.stdout
    .split('\n')
    .filter((file) => !!file)
    .map((file) => pathResolve(repoPath, file));
}

export async function setCommitAuthor(
  options: BackportOptions,
  username: string
) {
  const spinner = ora(`Changing author to "${options.username}"`).start();
  try {
    const res = await exec(
      `git commit --amend --no-edit --author "${username} <${username}@users.noreply.github.com>"`,
      { cwd: getRepoPath(options) }
    );
    spinner.succeed();
    return res;
  } catch (e) {
    spinner.fail();
    throw e;
  }
}

export async function addUnstagedFiles(options: BackportOptions) {
  return exec(`git add --update`, { cwd: getRepoPath(options) });
}

// How the commit flows:
// ${sourceBranch} -> ${backportBranch} -> ${targetBranch}
// Example:
// master -> backport/7.x/pr-1234 -> 7.x
export async function createBackportBranch({
  options,
  targetBranch,
  backportBranch,
}: {
  options: BackportOptions;
  targetBranch: string;
  backportBranch: string;
}) {
  const spinner = ora('Pulling latest changes').start();

  try {
    const res = await exec(
      `git reset --hard && git clean -d --force && git fetch ${options.repoOwner} ${targetBranch} && git checkout -B ${backportBranch} ${options.repoOwner}/${targetBranch} --no-track`,
      { cwd: getRepoPath(options) }
    );
    spinner.succeed();
    return res;
  } catch (e) {
    spinner.fail();

    const isBranchInvalid =
      e.stderr?.toLowerCase().includes(`couldn't find remote ref`) ||
      e.stderr?.toLowerCase().includes(`Invalid refspec`);

    if (isBranchInvalid) {
      throw new HandledError(
        `The branch "${targetBranch}" is invalid or doesn't exist`
      );
    }

    throw e;
  }
}

export function deleteBackportBranch({
  options,
  backportBranch,
}: {
  options: BackportOptions;
  backportBranch: string;
}) {
  return exec(
    `git checkout ${options.sourceBranch} && git branch -D ${backportBranch}`,
    { cwd: getRepoPath(options) }
  );
}

export function getRemoteName(options: BackportOptions) {
  return options.fork ? options.username : options.repoOwner;
}

/*
 * Returns the full name of the backport branch, which includes the upstream
 *
 * Example: `sqren:backport/7.x/pr-1234`
 */
export function getFullBackportBranch(
  options: BackportOptions,
  backportBranch: string
) {
  const remoteName = getRemoteName(options);
  return `${remoteName}:${backportBranch}`;
}

export async function pushBackportBranch({
  options,
  backportBranch,
}: {
  options: BackportOptions;
  backportBranch: string;
}) {
  const fullBackportBranch = getFullBackportBranch(options, backportBranch);
  const spinnerText = `Pushing branch "${fullBackportBranch}"`;
  const spinner = ora(spinnerText).start();

  if (options.dryRun) {
    spinner.succeed(`Dry run: ${spinnerText}`);
    return;
  }

  try {
    const remoteName = getRemoteName(options);
    const res = await exec(
      `git push ${remoteName} ${backportBranch}:${backportBranch} --force`,
      { cwd: getRepoPath(options) }
    );
    spinner.succeed();
    return res;
  } catch (e) {
    spinner.fail();
    throw e;
  }
}
