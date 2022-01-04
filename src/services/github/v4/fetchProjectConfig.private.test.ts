import { getDevAccessToken } from '../../../test/private/getDevAccessToken';
import { fetchProjectConfig } from './fetchProjectConfig';

describe('fetchProjectConfig', () => {
  let devAccessToken: string;

  beforeEach(async () => {
    devAccessToken = await getDevAccessToken();
  });

  it('returns the backport config from "main" branch', async () => {
    const projectConfig = await fetchProjectConfig({
      repoOwner: 'backport-org',
      repoName: 'repo-with-project-config',
      accessToken: devAccessToken,
      sourceBranch: 'main',
    });

    expect(projectConfig).toEqual({
      autoMerge: true,
      autoMergeMethod: 'squash',
      branchLabelMapping: {
        '^v(\\d+).(\\d+).\\d+$': '$1.$2',
        '^v8.1.0$': 'main',
      },
      targetBranchChoices: ['main', '8.0', '7.17', '7.16'],
      targetPRLabels: ['backport'],
      repoOwner: 'backport-org',
      repoName: 'repo-with-project-config',
    });
  });

  it('returns the backport config from "branch-with-legacy-config" branch', async () => {
    const projectConfig = await fetchProjectConfig({
      repoOwner: 'backport-org',
      repoName: 'repo-with-project-config',
      accessToken: devAccessToken,
      sourceBranch: 'branch-with-legacy-config',
    });

    expect(projectConfig).toEqual({
      targetBranchChoices: ['main', '8.0', '7.17', '7.16'],
      repoOwner: 'backport-org',
      repoName: 'repo-with-project-config',
    });
  });

  it('throws an error if config does not exist', async () => {
    const promise = fetchProjectConfig({
      repoOwner: 'backport-org',
      repoName: 'repo-with-project-config',
      accessToken: devAccessToken,
      sourceBranch: 'branch-with-no-config',
    });

    await expect(promise).rejects.toThrowError('Project config does not exist');
  });
});
