import { setAccessToken, verifyAccessToken } from '../services/github';
import { doBackportVersions } from './doBackportVersions';
import { BackportOptions } from '../options/options';
import { getCommits } from './getCommits';
import { getBranches } from './getBranches';
import { maybeSetupRepo } from './maybeSetupRepo';

export async function initSteps(options: BackportOptions) {
  const [owner, repoName] = options.upstream.split('/');
  await verifyAccessToken(owner, repoName, options.accessToken);
  setAccessToken(options.accessToken);

  const commits = await getCommits(options);
  const branches = await getBranches(options);

  await maybeSetupRepo({
    owner,
    repoName,
    username: options.username,
    accessToken: options.accessToken
  });
  await doBackportVersions(
    owner,
    repoName,
    commits,
    branches,
    options.username,
    options.labels,
    options.prDescription
  );
}
