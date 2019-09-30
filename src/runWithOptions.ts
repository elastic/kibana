import { BackportOptions } from './options/options';
import { verifyAccessToken } from './services/github/verifyAccessToken';
import { getBranches } from './ui/getBranches';
import { getCommits } from './ui/getCommits';
import { maybeSetupRepo } from './ui/maybeSetupRepo';
import { logger } from './services/logger';
import { cherrypickAndCreatePullRequest } from './ui/cherrypickAndCreatePullRequest';
import { sequentially } from './services/sequentially';
import { HandledError } from './services/HandledError';
import { addLabelsToPullRequest } from './services/github/addLabelsToPullRequest';
import { withSpinner } from './ui/withSpinner';

export async function runWithOptions(options: BackportOptions) {
  await verifyAccessToken(options);

  const commits = await getCommits(options);
  const branches = await getBranches(options);

  await maybeSetupRepo(options);

  let backportSucceeded = false; // minimum 1 backport PR was successfully created
  await sequentially(branches, async baseBranch => {
    logger.info(`Backporting ${JSON.stringify(commits)} to ${baseBranch}`);
    try {
      await cherrypickAndCreatePullRequest({ options, commits, baseBranch });
      backportSucceeded = true;
    } catch (e) {
      if (e instanceof HandledError) {
        console.error(e.message);
      } else {
        console.error(e);
        throw e;
      }
    }
  });

  if (backportSucceeded && options.backportCreatedLabels.length > 0) {
    Promise.all(
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
