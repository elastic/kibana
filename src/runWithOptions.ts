import chalk from 'chalk';
import { BackportOptions } from './options/options';
import { HandledError } from './services/HandledError';
import { logger, consoleLog } from './services/logger';
import { sequentially } from './services/sequentially';
import { cherrypickAndCreatePullRequest } from './ui/cherrypickAndCreatePullRequest';
import { getTargetBranches } from './ui/getBranches';
import { getCommits } from './ui/getCommits';
import { maybeSetupRepo } from './ui/maybeSetupRepo';

export async function runWithOptions(options: BackportOptions) {
  if (options.dryRun) {
    consoleLog(chalk.red('Dry run: Nothing will be pushed to Github\n'));
  }

  const commits = await getCommits(options);
  const targetBranches = await getTargetBranches(options, commits);

  await maybeSetupRepo(options);

  await sequentially(targetBranches, async (targetBranch) => {
    logger.info(`Backporting ${JSON.stringify(commits)} to ${targetBranch}`);
    try {
      await cherrypickAndCreatePullRequest({
        options,
        commits,
        targetBranch,
      });
    } catch (e) {
      if (e instanceof HandledError) {
        consoleLog(e.message);
      } else {
        throw e;
      }
    }
  });
}
