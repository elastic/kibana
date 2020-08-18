import chalk from 'chalk';
import { BackportOptions } from './options/options';
import { HandledError } from './services/HandledError';
import { logger, consoleLog, redact } from './services/logger';
import { sequentially } from './services/sequentially';
import { cherrypickAndCreateTargetPullRequest } from './ui/cherrypickAndCreateTargetPullRequest';
import { getCommits } from './ui/getCommits';
import { getTargetBranches } from './ui/getTargetBranches';
import { maybeSetupRepo } from './ui/maybeSetupRepo';

export type Result =
  | {
      success: true;
      targetBranch: string;
      pullRequestUrl: string;
    }
  | {
      success: false;
      targetBranch: string;
      errorMessage: string;
      error: Error;
    };

export async function runWithOptions(options: BackportOptions) {
  logger.verbose('Backport options', options);
  if (options.dryRun) {
    consoleLog(chalk.red('Dry run: Nothing will be pushed to Github\n'));
  }

  const commits = await getCommits(options);
  const targetBranches = await getTargetBranches(options, commits);

  await maybeSetupRepo(options);

  const results = [] as Result[];
  await sequentially(targetBranches, async (targetBranch) => {
    logger.info(`Backporting ${JSON.stringify(commits)} to ${targetBranch}`);
    try {
      const pullRequest = await cherrypickAndCreateTargetPullRequest({
        options,
        commits,
        targetBranch,
      });
      results.push({
        targetBranch,
        success: true,
        pullRequestUrl: pullRequest.url,
      });
    } catch (e) {
      const isHandledError = e instanceof HandledError;
      const errorMessage = isHandledError
        ? redact(e.message)
        : 'An unhandled error occurred. Please consult the logs';
      results.push({ targetBranch, success: false, errorMessage, error: e });

      consoleLog(errorMessage);
    }
  });

  // return the results for consumers to programatically read
  return results;
}
