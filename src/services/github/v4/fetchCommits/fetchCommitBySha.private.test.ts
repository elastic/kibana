import { getDevAccessToken } from '../../../../test/private/getDevAccessToken';
import { fetchCommitBySha } from './fetchCommitBySha';

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
        sourceBranch: 'master',
        historicalBranchLabelMappings: [],
      })
    ).toEqual({
      committedDate: '2020-07-07T20:40:28Z',
      originalMessage: '[APM] Add API tests (#70740)',
      pullNumber: 70740,
      pullUrl: 'https://github.com/elastic/kibana/pull/70740',
      sha: 'cb6fbc0e1b406675724181a3e9f59459b5f8f892',
      sourceBranch: 'master',
      expectedTargetPullRequests: [
        {
          branch: '7.x',
          state: 'MERGED',
          number: 71014,
          url: 'https://github.com/elastic/kibana/pull/71014',
        },
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
        sourceBranch: 'main',
        historicalBranchLabelMappings: [],
      })
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
        sourceBranch: 'main',
        historicalBranchLabelMappings: [],
      })
    ).rejects.toThrowError(
      'No commit found on branch "main" with sha "myCommitSha"'
    );
  });
});
