import { getCommits } from './entrypoint.module';
import { getDevAccessToken } from './test/private/getDevAccessToken';

describe('entrypoint.module', () => {
  it('getCommits', async () => {
    const accessToken = await getDevAccessToken();
    const commits = await getCommits({
      accessToken: accessToken,
      repoName: 'backport-e2e',
      repoOwner: 'backport-org',
      pullNumber: 2,
    });

    expect(commits).toEqual([
      {
        committedDate: '2020-08-15T10:44:04Z',
        expectedTargetPullRequests: [
          {
            branch: '7.x',
            number: 4,
            state: 'MERGED',
            url: 'https://github.com/backport-org/backport-e2e/pull/4',
            mergeCommit: {
              message: 'Add family emoji (#2) (#4)',
              sha: 'f8b4f6ae7ffaf2732fa5e33e98b3ea772bdfff1d',
            },
          },
        ],
        originalMessage: 'Add family emoji (#2)',
        pullNumber: 2,
        pullUrl: 'https://github.com/backport-org/backport-e2e/pull/2',
        sha: '59d6ff1ca90a4ce210c0a4f0e159214875c19d60',
        sourceBranch: 'master',
      },
    ]);
  });
});
