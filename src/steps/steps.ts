import { verifyAccessToken } from '../services/github';
import { doBackportVersions } from './doBackportVersions';
import { BackportOptions } from '../options/options';
import { getCommits } from './getCommits';
import { getBranches } from './getBranches';
import { maybeSetupRepo } from './maybeSetupRepo';

export async function initSteps(options: BackportOptions) {
  await verifyAccessToken(options);

  const commits = await getCommits(options);
  const branches = await getBranches(options);

  await maybeSetupRepo(options);
  await doBackportVersions(options, commits, branches);
}
