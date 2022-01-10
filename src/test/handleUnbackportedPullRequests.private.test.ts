import { resolve } from 'path';
import { getCommits, backportRun } from '../entrypoint.module';
import { getDevAccessToken } from './private/getDevAccessToken';

jest.unmock('find-up');
jest.setTimeout(15000);

describe('Handle unbackported pull requests', () => {
  it('shows missing backports for PR number 8', async () => {
    const accessToken = await getDevAccessToken();
    const commits = await getCommits({
      accessToken: accessToken,
      repoOwner: 'backport-org',
      repoName: 'repo-with-conflicts',
      pullNumber: 8,
    });

    expect(commits[0]).toEqual({
      committedDate: '2021-12-16T00:03:34Z',
      expectedTargetPullRequests: [{ branch: '7.x', state: 'MISSING' }],
      originalMessage: 'Change Barca to Braithwaite (#8)',
      pullNumber: 8,
      pullUrl: 'https://github.com/backport-org/repo-with-conflicts/pull/8',
      sha: '343402a748be2375325b2730fa979bcea5b96ba1',
      sourceBranch: 'main',
    });
  });

  it('shows that backport failed because PR number 8 was not backported', async () => {
    const accessToken = await getDevAccessToken();
    const result = await backportRun({
      accessToken: accessToken,
      repoOwner: 'backport-org',
      repoName: 'repo-with-conflicts',
      pullNumber: 12,
      targetBranches: ['7.x'],
      dir: resolve(
        './src/test/tmp-mock-environments/handleUnbackportedPullRequests'
      ),
      ci: true,
      publishStatusComment: false,
    });

    expect(
      //@ts-expect-error
      result.results[0].error.meta?.commitsWithoutBackports[0].commit.pullNumber
    ).toBe(8);
  });
});
