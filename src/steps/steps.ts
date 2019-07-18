import { BackportOptions } from '../options/options';
import { verifyAccessToken } from '../services/github/verifyAccessToken';
import { doBackportVersions } from './doBackportVersions';
import { getBranches } from './getBranches';
import { getCommits } from './getCommits';
import { maybeSetupRepo } from './maybeSetupRepo';

export async function initSteps(options: BackportOptions) {
  await verifyAccessToken(options);

  const commits = await getCommits(options);
  const branches = await getBranches(options);

  await maybeSetupRepo(options);
  await doBackportVersions(options, commits, branches);
}
