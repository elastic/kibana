import childProcess from 'child_process';
import rimraf from 'rimraf';
import { exec, stat } from './rpc';
import { HandledError } from './HandledError';
import { getRepoPath, getRepoOwnerPath } from './env';

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

export function repoExists({
  owner,
  repoName
}: {
  owner: string;
  repoName: string;
}): Promise<boolean> {
  return folderExists(getRepoPath(owner, repoName));
}

export function deleteRepo({
  owner,
  repoName
}: {
  owner: string;
  repoName: string;
}) {
  return new Promise(resolve => {
    const repoPath = getRepoPath(owner, repoName);
    rimraf(repoPath, resolve);
  });
}

function getRemoteUrl({
  owner,
  repoName,
  accessToken,
  gitHostname
}: {
  owner: string;
  repoName: string;
  accessToken: string;
  gitHostname: string;
}) {
  return `https://${accessToken}@${gitHostname}/${owner}/${repoName}.git`;
}

export function cloneRepo({
  owner,
  repoName,
  accessToken,
  callback,
  gitHostname
}: {
  owner: string;
  repoName: string;
  accessToken: string;
  callback: (progress: string) => void;
  gitHostname: string;
}) {
  return new Promise((resolve, reject) => {
    const execProcess = childProcess.exec(
      `git clone ${getRemoteUrl({
        accessToken,
        owner,
        repoName,
        gitHostname
      })} --progress`,
      { cwd: getRepoOwnerPath(owner), maxBuffer: 100 * 1024 * 1024 },
      error => {
        if (error) {
          reject(error);
        }
        resolve();
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

export async function deleteRemote({
  owner,
  repoName,
  username
}: {
  owner: string;
  repoName: string;
  username: string;
}) {
  try {
    await exec(`git remote rm ${username}`, {
      cwd: getRepoPath(owner, repoName)
    });
  } catch (e) {
    // note: swallowing error
    return;
  }
}

export async function addRemote({
  owner,
  repoName,
  username,
  accessToken,
  gitHostname
}: {
  owner: string;
  repoName: string;
  username: string;
  accessToken: string;
  gitHostname: string;
}) {
  try {
    await exec(
      `git remote add ${username} ${getRemoteUrl({
        accessToken,
        owner: username,
        repoName,
        gitHostname
      })}`,
      {
        cwd: getRepoPath(owner, repoName)
      }
    );
  } catch (e) {
    // note: swallowing error
    return;
  }
}

export function cherrypick({
  owner,
  repoName,
  sha
}: {
  owner: string;
  repoName: string;
  sha: string;
}) {
  return exec(`git cherry-pick ${sha}`, {
    cwd: getRepoPath(owner, repoName)
  });
}

export async function isIndexDirty({
  owner,
  repoName
}: {
  owner: string;
  repoName: string;
}) {
  try {
    await exec(`git diff-index --quiet HEAD --`, {
      cwd: getRepoPath(owner, repoName)
    });
    return false;
  } catch (e) {
    return true;
  }
}

export async function createAndCheckoutBranch({
  owner,
  repoName,
  baseBranch,
  featureBranch
}: {
  owner: string;
  repoName: string;
  baseBranch: string;
  featureBranch: string;
}) {
  try {
    return await exec(
      `git fetch origin ${baseBranch} && git branch ${featureBranch} origin/${baseBranch} --force && git checkout ${featureBranch} `,
      {
        cwd: getRepoPath(owner, repoName)
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

export function push({
  owner,
  repoName,
  remoteName,
  branchName
}: {
  owner: string;
  repoName: string;
  remoteName: string;
  branchName: string;
}) {
  return exec(`git push ${remoteName} ${branchName}:${branchName} --force`, {
    cwd: getRepoPath(owner, repoName)
  });
}

export async function resetAndPullMaster({
  owner,
  repoName
}: {
  owner: string;
  repoName: string;
}) {
  return exec(
    `git reset --hard && git clean -d --force && git checkout master && git pull origin master`,
    {
      cwd: getRepoPath(owner, repoName)
    }
  );
}
