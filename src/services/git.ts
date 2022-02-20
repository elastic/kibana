import { resolve as pathResolve } from 'path';
import { uniq, isEmpty, first, last } from 'lodash';
import { ValidConfigOptions } from '../options/options';
import { ora } from '../ui/ora';
import { filterNil } from '../utils/filterEmpty';
import { HandledError } from './HandledError';
import { execAsCallback, exec } from './child-process-promisified';
import { getRepoPath } from './env';
import { getShortSha } from './github/commitFormatters';
import { getRepoOwnerAndNameFromGitRemotes } from './github/v4/getRepoOwnerAndNameFromGitRemotes';
import { logger } from './logger';
import { ExpectedTargetPullRequest } from './sourceCommit/getExpectedTargetPullRequests';
import { Commit } from './sourceCommit/parseSourceCommit';

export function getRemoteUrl(
  { repoName, accessToken, gitHostname = 'github.com' }: ValidConfigOptions,
  repoOwner: string
) {
  return `https://x-access-token:${accessToken}@${gitHostname}/${repoOwner}/${repoName}.git`;
}

export async function cloneRepo(
  { sourcePath, targetPath }: { sourcePath: string; targetPath: string },
  onProgress: (progress: number) => void
) {
  return new Promise<void>((resolve, reject) => {
    const execProcess = execAsCallback(
      `git clone ${sourcePath} ${targetPath} --progress`,
      { maxBuffer: 100 * 1024 * 1024 },
      (error) => {
        return error ? reject(error) : resolve();
      }
    );

    const progress = {
      fileUpdate: 0,
      objectReceive: 0,
    };

    if (execProcess.stderr) {
      execProcess.stderr.on('data', (data) => {
        logger.verbose(data);
        const [, objectReceiveProgress]: RegExpMatchArray =
          data.toString().match(/^Receiving objects:\s+(\d+)%/) || [];

        if (objectReceiveProgress) {
          progress.objectReceive = parseInt(objectReceiveProgress, 10);
        }

        const [, fileUpdateProgress]: RegExpMatchArray =
          data.toString().match(/^Updating files:\s+(\d+)%/) || [];

        if (fileUpdateProgress) {
          progress.objectReceive = 100;
          progress.fileUpdate = parseInt(fileUpdateProgress, 10);
        }

        const progressSum = Math.round(
          progress.fileUpdate * 0.1 + progress.objectReceive * 0.9
        );

        if (progressSum > 0) {
          onProgress(progressSum);
        }
      });
    }
  });
}

export async function getLocalConfigFileCommitDate({ cwd }: { cwd: string }) {
  try {
    const { stdout } = await exec(
      'git --no-pager log -1 --format=%cd .backportrc.js*',
      { cwd }
    );

    const timestamp = Date.parse(stdout);
    if (timestamp > 0) {
      return timestamp;
    }
  } catch (e) {
    return;
  }
}

export async function isLocalConfigFileUntracked({ cwd }: { cwd: string }) {
  try {
    // list untracked files
    const { stdout } = await exec(
      'git ls-files .backportrc.js*  --exclude-standard --others',
      { cwd }
    );

    return !!stdout;
  } catch (e) {
    return;
  }
}

export async function isLocalConfigFileModified({ cwd }: { cwd: string }) {
  try {
    const { stdout } = await exec(
      'git  --no-pager diff HEAD --name-only  .backportrc.js*',
      { cwd }
    );

    return !!stdout;
  } catch (e) {
    return;
  }
}

export async function getRepoInfoFromGitRemotes({ cwd }: { cwd: string }) {
  try {
    const { stdout } = await exec('git remote --verbose', { cwd });
    const remotes = stdout
      .split('\n')
      .map((line) => {
        const match = line.match(/.+github.com:(.+?)(.git)? \((fetch|push)\)/);
        return match?.[1];
      })
      .filter(filterNil);

    return uniq(remotes).map((remote) => {
      const [repoOwner, repoName] = remote.split('/');
      return { repoOwner, repoName };
    });
  } catch (e) {
    return [];
  }
}

export async function getGitProjectRoot(dir: string) {
  try {
    const { stdout } = await exec('git rev-parse --show-toplevel', {
      cwd: dir,
    });
    return stdout.trim();
  } catch (e) {
    logger.error('An error occurred while retrieving git project root', e);
    return;
  }
}

export async function getIsCommitInBranch(
  options: ValidConfigOptions,
  commitSha: string
) {
  try {
    await exec(`git merge-base --is-ancestor ${commitSha} HEAD`, {
      cwd: getRepoPath(options),
    });
    return true;
  } catch (e) {
    const isExecError = e.cmd && e.code > 0;
    // re-throw if error is not an exec related error
    if (!isExecError) {
      throw e;
    }
    return false;
  }
}

export async function deleteRemote(
  options: ValidConfigOptions,
  remoteName: string
) {
  try {
    await exec(`git remote rm ${remoteName}`, { cwd: getRepoPath(options) });
  } catch (e) {
    const isExecError = e.cmd && e.code > 0;
    // re-throw if error is not an exec related error
    if (!isExecError) {
      throw e;
    }
  }
}

export async function addRemote(
  options: ValidConfigOptions,
  remoteName: string
) {
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

export async function fetchBranch(options: ValidConfigOptions, branch: string) {
  await exec(`git fetch ${options.repoOwner} ${branch}:${branch} --force`, {
    cwd: getRepoPath(options),
  });
}

export async function getIsMergeCommit(
  options: ValidConfigOptions,
  sha: string
) {
  const res = await exec(`git rev-list -1 --merges ${sha}~1..${sha}`, {
    cwd: getRepoPath(options),
  });

  return res.stdout !== '';
}

export async function getCommitsInMergeCommit(
  options: ValidConfigOptions,
  sha: string
) {
  try {
    const res = await exec(
      `git --no-pager log ${sha}^1..${sha}^2  --pretty=format:"%H"`,
      {
        cwd: getRepoPath(options),
      }
    );

    return res.stdout.split('\n');
  } catch (e) {
    // swallow error
    if (e.code === 128) {
      return [];
    }

    throw e;
  }
}

export async function cherrypick(
  options: ValidConfigOptions,
  sha: string,
  mergedTargetPullRequest?: ExpectedTargetPullRequest
): Promise<{
  conflictingFiles: {
    absolute: string;
    relative: string;
  }[];
  unstagedFiles: string[];
  needsResolving: boolean;
}> {
  const mainlinArg =
    options.mainline != undefined ? ` --mainline ${options.mainline}` : '';
  const cherrypickRefArg = options.cherrypickRef === false ? '' : ' -x';

  let shaOrRange = sha;

  if (!options.mainline) {
    try {
      const isMergeCommit = await getIsMergeCommit(options, sha);
      if (isMergeCommit) {
        const shas = await getCommitsInMergeCommit(options, sha);
        shaOrRange = `${last(shas)}^..${first(shas)}`;
      }
    } catch (e) {
      // swallow error if it's a known error
      // exit 128 will happen for many things, among others when the cherrypicked commit is empty
      if (e.code !== 128) {
        throw e;
      }
    }
  }
  const cmd = `git cherry-pick${cherrypickRefArg}${mainlinArg} ${shaOrRange}`;

  try {
    await exec(cmd, { cwd: getRepoPath(options) });
    return { conflictingFiles: [], unstagedFiles: [], needsResolving: false };
  } catch (e) {
    // missing `mainline` option
    if (e.message.includes('is a merge but no -m option was given')) {
      throw new HandledError(
        'Cherrypick failed because the selected commit was a merge commit. Please try again by specifying the parent with the `mainline` argument:\n\n> backport --mainline\n\nor:\n\n> backport --mainline <parent-number>\n\nOr refer to the git documentation for more information: https://git-scm.com/docs/git-cherry-pick#Documentation/git-cherry-pick.txt---mainlineparent-number'
      );
    }

    // commit was already backported
    if (e.message.includes('The previous cherry-pick is now empty')) {
      const shortSha = getShortSha(sha);

      throw new HandledError(
        `Cherrypick failed because the selected commit (${shortSha}) is empty. ${
          mergedTargetPullRequest?.url
            ? `It looks like the commit was already backported in ${mergedTargetPullRequest.url}`
            : 'Did you already backport this commit? '
        }`
      );
    }

    // git info missing
    if (e.message.includes('Please tell me who you are')) {
      throw new HandledError(`Cherrypick failed:\n${e.message}`);
    }

    if (e.message.includes(`bad object ${sha}`)) {
      throw new HandledError(
        `Cherrypick failed because commit "${sha}" was not found`
      );
    }

    const isCherryPickError = e.cmd === cmd;

    if (isCherryPickError) {
      const [conflictingFiles, unstagedFiles] = await Promise.all([
        getConflictingFiles(options),
        getUnstagedFiles(options),
      ]);

      if (!isEmpty(conflictingFiles) || !isEmpty(unstagedFiles))
        return { conflictingFiles, unstagedFiles, needsResolving: true };
    }

    // re-throw error if there are no conflicts to solve
    throw e;
  }
}

export async function commitChanges(
  commit: Commit,
  options: ValidConfigOptions
) {
  const noVerifyFlag = options.noVerify ? ` --no-verify` : '';

  try {
    await exec(`git commit --no-edit${noVerifyFlag}`, {
      cwd: getRepoPath(options),
    });
  } catch (e) {
    if (e.stdout?.includes('nothing to commit')) {
      logger.info(
        `Could not run "git commit". Probably because the changes were manually committed`,
        e
      );
      return;
    }

    // manually set the commit message if the inferred commit message is empty
    // this can happen if the user runs `git reset HEAD` and thereby aborts the cherrypick process
    if (e.stderr?.includes('Aborting commit due to empty commit message')) {
      await exec(
        `git commit -m "${commit.sourceCommit.message}" ${noVerifyFlag}`,
        {
          cwd: getRepoPath(options),
        }
      );
      return;
    }

    // rethrow error if it can't be handled
    throw e;
  }
}

export type ConflictingFiles = Awaited<ReturnType<typeof getConflictingFiles>>;
export async function getConflictingFiles(options: ValidConfigOptions) {
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
          return filename;
        });

      const uniqueFiles = uniq(files);
      return uniqueFiles.map((file) => {
        return {
          absolute: pathResolve(repoPath, file),
          relative: file,
        };
      });
    }

    // rethrow error since it's unrelated
    throw e;
  }
}

// retrieve the list of files that could not be cleanly merged
export async function getUnstagedFiles(options: ValidConfigOptions) {
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
  options: ValidConfigOptions,
  author: string
) {
  const spinner = ora(options.ci, `Changing author to "${author}"`).start();
  try {
    const res = await exec(
      `git commit --amend --no-edit --author "${author} <${author}@users.noreply.github.com>"`,
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
  options: ValidConfigOptions;
  targetBranch: string;
  backportBranch: string;
}) {
  const spinner = ora(options.ci, 'Pulling latest changes').start();

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
  options: ValidConfigOptions;
  backportBranch: string;
}) {
  const spinner = ora(options.ci).start();

  await exec(
    `git reset --hard && git checkout ${options.sourceBranch} && git branch -D ${backportBranch}`,
    { cwd: getRepoPath(options) }
  );

  spinner.stop();
}

/*
 * Returns the repo owner of the forked repo or the source repo
 */
export function getRepoForkOwner(options: ValidConfigOptions) {
  return options.fork ? options.authenticatedUsername : options.repoOwner;
}

export async function pushBackportBranch({
  options,
  backportBranch,
}: {
  options: ValidConfigOptions;
  backportBranch: string;
}) {
  const repoForkOwner = getRepoForkOwner(options);
  const spinner = ora(
    options.ci,
    `Pushing branch "${repoForkOwner}:${backportBranch}"`
  ).start();

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
        `Error pushing to https://github.com/${repoForkOwner}/${options.repoName}. Repository does not exist. Either fork the source repository (https://github.com/${options.repoOwner}/${options.repoName}) or disable fork mode "--no-fork".  Read more about "fork mode" in the docs: https://github.com/sqren/backport/blob/3a182b17e0e7237c12915895aea9d71f49eb2886/docs/configuration.md#fork`
      );
    }

    throw e;
  }
}

export async function getSourceRepoPath(options: ValidConfigOptions) {
  const gitRemote = await getRepoOwnerAndNameFromGitRemotes(options);

  // where to fetch the repo from (either remotely from Github or from a local path)
  const remoteUrl = getRemoteUrl(options, options.repoOwner);
  const sourcePath =
    options.repoName === gitRemote.repoName &&
    options.repoOwner === gitRemote.repoOwner
      ? (await getGitProjectRoot(options.cwd)) ?? remoteUrl
      : remoteUrl;

  return sourcePath;
}
