import childProcess from 'child_process';
import rimraf from 'rimraf';
import { exec, stat } from './rpc';
import { HandledError } from './HandledError';
import { getRepoPath, getRepoOwnerPath } from './env';
import { BackportOptions } from '../options/options';

async function folderExists(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
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
  return new Promise(resolve => {
    const repoPath = getRepoPath(options);
    rimraf(repoPath, resolve);
  });
}

function getRemoteUrl({
  repoOwner,
  repoName,
  accessToken,
  gitHostname
}: BackportOptions) {
  return `https://${accessToken}@${gitHostname}/${repoOwner}/${repoName}.git`;
}

export function cloneRepo(
  options: BackportOptions,
  callback: (progress: string) => void
) {
  return new Promise((resolve, reject) => {
    const execProcess = childProcess.exec(
      `git clone ${getRemoteUrl(options)} --progress`,
      {
        cwd: getRepoOwnerPath(options),
        maxBuffer: 100 * 1024 * 1024
      },
      error => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      }
    );

    if (execProcess.stderr) {
      execProcess.stderr.on('data', data => {
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
    await exec(`git remote rm ${remoteName}`, {
      cwd: getRepoPath(options)
    });
  } catch (e) {
    // note: swallowing error
    return;
  }
}

export async function addRemote(options: BackportOptions, remoteName: string) {
  try {
    await exec(
      `git remote add ${remoteName} https://${options.accessToken}@${
        options.gitHostname
      }/${remoteName}/${options.repoName}.git`,
      {
        cwd: getRepoPath(options)
      }
    );
  } catch (e) {
    // note: swallowing error
    return;
  }
}

export function cherrypick(options: BackportOptions, commitSha: string) {
  return exec(`git cherry-pick ${commitSha}`, {
    cwd: getRepoPath(options)
  });
}

export async function isIndexDirty(options: BackportOptions) {
  try {
    await exec(`git diff-index --quiet HEAD --`, {
      cwd: getRepoPath(options)
    });
    return false;
  } catch (e) {
    return true;
  }
}

export async function createAndCheckoutBranch(
  options: BackportOptions,
  baseBranch: string,
  featureBranch: string
) {
  try {
    return await exec(
      `git fetch origin ${baseBranch} && git branch ${featureBranch} origin/${baseBranch} --force && git checkout ${featureBranch} `,
      {
        cwd: getRepoPath(options)
      }
    );
  } catch (e) {
    if (
      e.stderr.includes(`Couldn't find remote ref`) ||
      e.stderr.includes(`Invalid refspec`)
    ) {
      throw new HandledError(
        `The branch "${baseBranch}"  is invalid or doesn't exist`
      );
    }
    throw e;
  }
}

export function push(options: BackportOptions, featureBranch: string) {
  return exec(
    `git push ${options.username} ${featureBranch}:${featureBranch} --force`,
    {
      cwd: getRepoPath(options)
    }
  );
}

export async function resetAndPullMaster(options: BackportOptions) {
  return exec(
    `git reset --hard && git clean -d --force && git checkout master && git pull origin master`,
    {
      cwd: getRepoPath(options)
    }
  );
}
