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

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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

    if (e.message.includes(`bad object ${commit.sha}`)) {
      throw new HandledError(
        `Backport failed because commit "${commit.sha}" was not found`
      );
    }

    const isCherryPickError = e.cmd === cmd;
    const hasConflicts = !isEmpty(await getConflictingFiles(options));
    const hasUnstagedFiles = !isEmpty(await getUnstagedFiles(options));

    if (isCherryPickError && (hasConflicts || hasUnstagedFiles)) {
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

export async function getConflictingFiles(options: BackportOptions) {
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
export async function getUnstagedFiles(options: BackportOptions) {
  const repoPath = getRepoPath(options);
  const res = await exec(`git --no-pager diff --name-only`, {
    cwd: repoPath,
  });
  const files = res.stdout
    .split('\n')
    .filter((file) => !!file)
    .map((file) => pathResolve(repoPath, file));

  return uniq(files);
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

// How the commit flows:
// ${sourceBranch} ->   ${backportBranch}   -> ${targetBranch}
//     master      ->  backport/7.x/pr-1234 ->      7.x
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
      e.stderr?.toLowerCase().includes(`invalid refspec`);

    if (isBranchInvalid) {
      throw new HandledError(
        `The branch "${targetBranch}" is invalid or doesn't exist`
      );
    }

    throw e;
  }
}

export async function deleteBackportBranch({
  options,
  backportBranch,
}: {
  options: BackportOptions;
  backportBranch: string;
}) {
  const spinner = ora().start();

  await exec(
    `git reset --hard && git checkout ${options.sourceBranch} && git branch -D ${backportBranch}`,
    { cwd: getRepoPath(options) }
  );

  spinner.stop();
}

/*
 * Returns the repo owner of the forked repo or the source repo
 */
export function getRepoForkOwner(options: BackportOptions) {
  return options.fork ? options.username : options.repoOwner;
}

export async function pushBackportBranch({
  options,
  backportBranch,
}: {
  options: BackportOptions;
  backportBranch: string;
}) {
  const repoForkOwner = getRepoForkOwner(options);
  const spinnerText = `Pushing branch "${repoForkOwner}:${backportBranch}"`;
  const spinner = ora(spinnerText).start();

  if (options.dryRun) {
    spinner.succeed(`Dry run: ${spinnerText}`);
    return;
  }

  try {
    const res = await exec(
      `git push ${repoForkOwner} ${backportBranch}:${backportBranch} --force`,
      { cwd: getRepoPath(options) }
    );
    spinner.succeed();
    return res;
  } catch (e) {
    spinner.fail();

    if (e.stderr?.toLowerCase().includes(`repository not found`)) {
      throw new HandledError(
        `Error pushing to https://github.com/${repoForkOwner}/${options.repoName}. Repository does not exist. Either fork the source repository (https://github.com/${options.repoOwner}/${options.repoName}) or disable fork mode "--fork false".  Read more about "fork mode" in the docs: https://github.com/sqren/backport/blob/3a182b17e0e7237c12915895aea9d71f49eb2886/docs/configuration.md#fork`
      );
    }

    throw e;
  }
}
