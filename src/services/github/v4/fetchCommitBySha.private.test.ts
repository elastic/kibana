import { ValidConfigOptions } from '../../../options/options';
import { getDevAccessToken } from '../../../test/private/getDevAccessToken';
import { fetchCommitBySha } from './fetchCommitBySha';

type BackportOptionsWithSha = ValidConfigOptions & { sha: string };

describe('fetchCommitBySha', () => {
  let devAccessToken: string;

  beforeEach(async () => {
    devAccessToken = await getDevAccessToken();
  });

  it('should return single commit with pull request', async () => {
    await expect(
      await fetchCommitBySha({
        repoOwner: 'elastic',
        repoName: 'kibana',
        accessToken: devAccessToken,
        sha: 'cb6fbc0',
        githubApiBaseUrlV4: 'https://api.github.com/graphql',
        sourceBranch: 'master',
      } as BackportOptionsWithSha)
    ).toEqual({
      formattedMessage: '[APM] Add API tests (#70740)',
      originalMessage: '[APM] Add API tests (#70740)',
      pullNumber: 70740,
      sha: 'cb6fbc0e1b406675724181a3e9f59459b5f8f892',
      sourceBranch: 'master',
      targetBranchesFromLabels: [],
      existingTargetPullRequests: [
        { branch: '7.x', state: 'MERGED', number: 71014 },
      ],
    });
  });

  it('throws if sha does not exist', async () => {
    await expect(
      fetchCommitBySha({
        repoOwner: 'elastic',
        repoName: 'kibana',
        accessToken: devAccessToken,
        sha: 'fc22f59',
        githubApiBaseUrlV4: 'https://api.github.com/graphql',
        sourceBranch: 'main',
      } as BackportOptionsWithSha)
    ).rejects.toThrowError(
      'No commit found on branch "main" with sha "fc22f59"'
    );
  });

  it('throws if sha is invalid', async () => {
    await expect(
      fetchCommitBySha({
        repoOwner: 'elastic',
        repoName: 'kibana',
        accessToken: devAccessToken,
        sha: 'myCommitSha',
        githubApiBaseUrlV4: 'https://api.github.com/graphql',
        sourceBranch: 'main',
      } as ValidConfigOptions & { sha: string })
    ).rejects.toThrowError(
      'No commit found on branch "main" with sha "myCommitSha"'
    );
  });
});
