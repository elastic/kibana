import { Commit, getCommits } from './entrypoint.module';
import { getDevAccessToken } from './test/private/getDevAccessToken';

describe('entrypoint.module', () => {
  it('getCommits', async () => {
    const accessToken = getDevAccessToken();
    const commits = await getCommits({
      accessToken: accessToken,
      repoName: 'backport-e2e',
      repoOwner: 'backport-org',
      pullNumber: 2,
    });

    const expectedCommits: Commit[] = [
      {
        sourceCommit: {
          committedDate: '2020-08-15T10:44:04Z',
          message: 'Add family emoji (#2)',
          sha: '59d6ff1ca90a4ce210c0a4f0e159214875c19d60',
        },
        sourcePullRequest: {
          number: 2,
          url: 'https://github.com/backport-org/backport-e2e/pull/2',
          mergeCommit: {
            message: 'Add family emoji (#2)',
            sha: '59d6ff1ca90a4ce210c0a4f0e159214875c19d60',
          },
        },
        sourceBranch: 'master',
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
      },
    ];

    expect(commits).toEqual(expectedCommits);
  });
});
