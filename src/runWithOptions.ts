import { BackportOptions } from './options/options';
import { HandledError } from './services/HandledError';
import { addLabelsToPullRequest } from './services/github/v3/addLabelsToPullRequest';
import { logger, consoleLog } from './services/logger';
import { sequentially } from './services/sequentially';
import { cherrypickAndCreatePullRequest } from './ui/cherrypickAndCreatePullRequest';
import { getTargetBranches } from './ui/getBranches';
import { getCommits } from './ui/getCommits';
import { maybeSetupRepo } from './ui/maybeSetupRepo';
import { withSpinner } from './ui/withSpinner';

export async function runWithOptions(options: BackportOptions) {
  const commits = await getCommits(options);
  const targetBranches = await getTargetBranches(options, commits);

  await maybeSetupRepo(options);

  let backportSucceeded = false; // minimum 1 backport PR was successfully created
  await sequentially(targetBranches, async (targetBranch) => {
    logger.info(`Backporting ${JSON.stringify(commits)} to ${targetBranch}`);
    try {
      await cherrypickAndCreatePullRequest({
        options,
        commits,
        targetBranch,
      });
      backportSucceeded = true;
    } catch (e) {
      if (e instanceof HandledError) {
        consoleLog(e.message);
      } else {
        throw e;
      }
    }
  });

  if (backportSucceeded && options.backportCreatedLabels.length > 0) {
    await Promise.all(
      commits.map(async ({ pullNumber }) => {
        if (pullNumber) {
          return withSpinner(
            { text: `Adding labels to #${pullNumber}` },
            () => {
              return addLabelsToPullRequest(
                options,
                pullNumber,
                options.backportCreatedLabels
              );
            }
          );
        }
      })
    );
  }
}
