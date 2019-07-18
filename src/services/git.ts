import del from 'del';
import { BackportOptions } from '../options/options';
import { HandledError } from './HandledError';
import { stat } from './fs-promisified';
import { getRepoOwnerPath, getRepoPath } from './env';
import { execAsCallback, exec } from './child-process-promisified';

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
      `git remote add ${remoteName} ${getRemoteUrl(options, remoteName)}`,
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
  return exec(
    `git fetch ${options.repoOwner} master:master --force && git cherry-pick ${commitSha}`,
    {
      cwd: getRepoPath(options)
    }
  );
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

export async function createFeatureBranch(
  options: BackportOptions,
  baseBranch: string,
  featureBranch: string
) {
  try {
    return await exec(
      `git reset --hard && git clean -d --force && git fetch ${options.repoOwner} ${baseBranch} && git checkout -B ${featureBranch} ${options.repoOwner}/${baseBranch} --no-track`,
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

export function deleteFeatureBranch(
  options: BackportOptions,
  featureBranch: string
) {
  return exec(`git checkout master && git branch -D ${featureBranch}`, {
    cwd: getRepoPath(options)
  });
}

export function pushFeatureBranch(
  options: BackportOptions,
  featureBranch: string
) {
  return exec(
    `git push ${options.username} ${featureBranch}:${featureBranch} --force`,
    {
      cwd: getRepoPath(options)
    }
  );
}
