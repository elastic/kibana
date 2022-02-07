import { ValidConfigOptions } from './options/options';
import { HandledError } from './services/HandledError';
import { logger, consoleLog } from './services/logger';
import { sequentially } from './services/sequentially';
import { Commit } from './services/sourceCommit/parseSourceCommit';
import { cherrypickAndCreateTargetPullRequest } from './ui/cherrypickAndCreateTargetPullRequest';
import { maybeSetupRepo } from './ui/maybeSetupRepo';

export type Result =
  | {
      // only set for success
      status: 'success';
      didUpdate: boolean;
      targetBranch: string;
      pullRequestUrl: string;
      pullRequestNumber: number;
    }
  | {
      // only set for failure
      status: 'failure';
      targetBranch: string;
      error: HandledError;
    };

export async function runSequentially({
  options,
  commits,
  targetBranches,
}: {
  options: ValidConfigOptions;
  commits: Commit[];
  targetBranches: string[];
}): Promise<Result[]> {
  logger.verbose('Backport options', options);
  await maybeSetupRepo(options);
  const results = [] as Result[];
  await sequentially(targetBranches, async (targetBranch) => {
    logger.info(`Backporting ${JSON.stringify(commits)} to ${targetBranch}`);
    try {
      const { number, url, didUpdate } =
        await cherrypickAndCreateTargetPullRequest({
          options,
          commits,
          targetBranch,
        });

      results.push({
        targetBranch,
        status: 'success',
        didUpdate,
        pullRequestUrl: url,
        pullRequestNumber: number,
      });
    } catch (e) {
      results.push({
        targetBranch,
        status: 'failure',
        error: e,
      });
      consoleLog(e.message);
    }
  });

  // return the results for consumers to programatically read
  return results;
}
