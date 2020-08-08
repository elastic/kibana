import { BackportOptions } from '../../../options/options';
import { getDevAccessToken } from '../../../test/private/getDevAccessToken';
import { fetchCommitBySha } from './fetchCommitBySha';

type BackportOptionsWithSha = BackportOptions & { sha: string };

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
        githubApiBaseUrlV3: 'https://api.github.com',
      } as BackportOptionsWithSha)
    ).toEqual({
      formattedMessage: '[APM] Add API tests (#70740)',
      pullNumber: undefined,
      sha: 'cb6fbc0e1b406675724181a3e9f59459b5f8f892',
      sourceBranch: 'master',
      targetBranchesFromLabels: [],
    });
  });

  it('should throw error if sha does not exist', async () => {
    await expect(
      fetchCommitBySha({
        repoOwner: 'elastic',
        repoName: 'kibana',
        accessToken: devAccessToken,
        sha: 'fc22f59',
        githubApiBaseUrlV3: 'https://api.github.com',
      } as BackportOptionsWithSha)
    ).rejects.toThrowError('No commit found on master with sha "fc22f59"');
  });

  it('should throw error if sha is invalid', async () => {
    await expect(
      fetchCommitBySha({
        repoOwner: 'elastic',
        repoName: 'kibana',
        accessToken: devAccessToken,
        sha: 'myCommitSha',
        githubApiBaseUrlV3: 'https://api.github.com',
      } as BackportOptions & { sha: string })
    ).rejects.toThrowError(
      'The given commit SHA is not in a recognized format (Github v3)'
    );
  });
});
