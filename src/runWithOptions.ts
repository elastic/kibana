import { BackportOptions } from './options/options';
import { verifyAccessToken } from './services/github/verifyAccessToken';
import { doBackportVersions } from './ui/doBackportVersions';
import { getBranches } from './ui/getBranches';
import { getCommits } from './ui/getCommits';
import { maybeSetupRepo } from './ui/maybeSetupRepo';
import { logger } from './services/logger';

export async function runWithOptions(options: BackportOptions) {
  await verifyAccessToken(options);

  const commits = await getCommits(options);
  const branches = await getBranches(options);

  await maybeSetupRepo(options);

  logger.info(`Backporting ${JSON.stringify(commits)} ${branches.join(',')}`);
  await doBackportVersions(options, commits, branches);
}
