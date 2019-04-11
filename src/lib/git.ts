import childProcess from 'child_process';
import rimraf from 'rimraf';
import * as env from './env';
import { mkdirp, stat, exec } from './rpc';
import { HandledError } from './errors';

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

export function repoExists(owner: string, repoName: string): Promise<boolean> {
  return folderExists(env.getRepoPath(owner, repoName));
}

type CloneProgessHandler = (progress: string) => void;

// Clone repo and add remotes
export async function setupRepo(
  owner: string,
  repoName: string,
  username: string,
  callback: CloneProgessHandler
) {
  await mkdirp(env.getRepoOwnerPath(owner));
  await cloneRepo(owner, repoName, callback);
  return addRemote(owner, repoName, username);
}

export function deleteRepo(owner: string, repoName: string) {
  return new Promise(resolve => {
    const repoPath = env.getRepoPath(owner, repoName);
    rimraf(repoPath, resolve);
  });
}

function getRemoteUrl(owner: string, repoName: string) {
  return `git@github.com:${owner}/${repoName}`;
}

function cloneRepo(
  owner: string,
  repoName: string,
  callback: CloneProgessHandler
) {
  return new Promise((resolve, reject) => {
    const execProcess = childProcess.exec(
      `git clone ${getRemoteUrl(owner, repoName)} --progress`,
      { cwd: env.getRepoOwnerPath(owner), maxBuffer: 100 * 1024 * 1024 },
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

function addRemote(owner: string, repoName: string, username: string) {
  return exec(
    `git remote add ${username} ${getRemoteUrl(username, repoName)}`,
    {
      cwd: env.getRepoPath(owner, repoName)
    }
  );
}

export function cherrypick(owner: string, repoName: string, sha: string) {
  return exec(`git cherry-pick ${sha}`, {
    cwd: env.getRepoPath(owner, repoName)
  });
}

export async function isIndexDirty(owner: string, repoName: string) {
  try {
    await exec(`git diff-index --quiet HEAD --`, {
      cwd: env.getRepoPath(owner, repoName)
    });
    return false;
  } catch (e) {
    return true;
  }
}

export async function createAndCheckoutBranch(
  owner: string,
  repoName: string,
  baseBranch: string,
  featureBranch: string
) {
  try {
    return await exec(
      `git fetch origin ${baseBranch} && git branch ${featureBranch} origin/${baseBranch} --force && git checkout ${featureBranch} `,
      {
        cwd: env.getRepoPath(owner, repoName)
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

export function push(
  owner: string,
  repoName: string,
  username: string,
  branchName: string
) {
  return exec(`git push ${username} ${branchName}:${branchName} --force`, {
    cwd: env.getRepoPath(owner, repoName)
  });
}

export async function resetAndPullMaster(owner: string, repoName: string) {
  return exec(
    `git reset --hard && git clean -d --force && git checkout master && git pull origin master`,
    {
      cwd: env.getRepoPath(owner, repoName)
    }
  );
}

export async function verifyGithubSshAuth() {
  try {
    await exec(`ssh -oBatchMode=yes -T git@github.com`);
    return true;
  } catch (e) {
    switch (e.code) {
      case 1:
        return true;
      case 255:
        if (e.stderr.includes('Host key verification failed.')) {
          throw new HandledError(
            'Host verification of github.com failed. To automatically add it to .ssh/known_hosts run:\nssh -T git@github.com'
          );
        } else if (e.stderr.includes('Permission denied')) {
          throw new HandledError(
            'Permission denied. Please add your ssh private key to the keychain by following these steps:\nhttps://help.github.com/articles/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent/#adding-your-ssh-key-to-the-ssh-agent'
          );
        } else {
          throw e;
        }

      default:
        throw e;
    }
  }
}
