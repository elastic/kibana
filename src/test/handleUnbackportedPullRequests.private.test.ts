import { getCommits, backportRun, Commit } from '../entrypoint.module';
import { exec } from '../services/child-process-promisified';
import { getDevAccessToken } from './private/getDevAccessToken';
import { getSandboxPath, resetSandbox } from './sandbox';

jest.unmock('find-up');
jest.setTimeout(15000);

describe('Handle unbackported pull requests', () => {
  it('shows missing backports for PR number 8', async () => {
    const accessToken = getDevAccessToken();
    const commits = await getCommits({
      accessToken: accessToken,
      repoOwner: 'backport-org',
      repoName: 'repo-with-conflicts',
      pullNumber: 8,
    });

    const expectedCommit: Commit = {
      sourceCommit: {
        committedDate: '2021-12-16T00:03:34Z',
        message: 'Change Barca to Braithwaite (#8)',
        sha: '343402a748be2375325b2730fa979bcea5b96ba1',
      },
      sourcePullRequest: {
        number: 8,
        url: 'https://github.com/backport-org/repo-with-conflicts/pull/8',
        mergeCommit: {
          message: 'Change Barca to Braithwaite (#8)',
          sha: '343402a748be2375325b2730fa979bcea5b96ba1',
        },
      },
      sourceBranch: 'main',
      expectedTargetPullRequests: [{ branch: '7.x', state: 'MISSING' }],
    };

    expect(commits[0]).toEqual(expectedCommit);
  });

  it('shows that backport failed because PR number 8 was not backported', async () => {
    const accessToken = getDevAccessToken();
    const sandboxPath = getSandboxPath({ filename: __filename });
    await resetSandbox(sandboxPath);
    await exec('git init', { cwd: sandboxPath });

    const result = await backportRun({
      accessToken: accessToken,
      repoOwner: 'backport-org',
      repoName: 'repo-with-conflicts',
      pullNumber: 12,
      targetBranches: ['7.x'],
      dir: sandboxPath,
      ci: true,
      publishStatusComment: false,
    });

    const commit: Commit =
      //@ts-expect-error
      result.results[0].error.errorContext?.commitsWithoutBackports[0].commit;

    expect(commit.sourcePullRequest?.number).toBe(8);
  });
});
