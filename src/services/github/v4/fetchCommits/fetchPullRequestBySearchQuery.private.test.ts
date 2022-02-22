import { ValidConfigOptions } from '../../../../options/options';
import { getDevAccessToken } from '../../../../test/private/getDevAccessToken';
import { Commit } from '../../../sourceCommit/parseSourceCommit';
import { fetchPullRequestBySearchQuery } from './fetchPullRequestBySearchQuery';

describe('fetchPullRequestBySearchQuery', () => {
  let devAccessToken: string;

  beforeAll(() => {
    devAccessToken = getDevAccessToken();
  });

  describe('when filter does not match any PRs', () => {
    it('throws an error', async () => {
      const options = {
        accessToken: devAccessToken,
        maxNumber: 10,
        prFilter: 'label:non-existing',
        repoName: 'backport-e2e',
        repoOwner: 'backport-org',
        sourceBranch: 'master',
        author: 'sqren',
      } as ValidConfigOptions;

      await expect(fetchPullRequestBySearchQuery(options)).rejects.toThrowError(
        'There are no commits by "sqren" matching the filter "label:non-existing". Try with `--all` for commits by all users or `--author=<username>` for commits from a specific user'
      );
    });
  });

  describe('when filter matches PRs', () => {
    it('returns the merge commits for those PRs', async () => {
      const options = {
        accessToken: devAccessToken,
        maxNumber: 10,
        prFilter: 'label:v7.8.0',
        repoName: 'backport-e2e',
        repoOwner: 'backport-org',
        sourceBranch: 'master',
        author: 'sqren',
      } as ValidConfigOptions;

      const expectedCommits: Commit[] = [
        {
          author: { email: 'sorenlouv@gmail.com', name: 'Søren Louv-Jansen' },
          sourceCommit: {
            committedDate: '2020-08-16T21:44:28Z',
            message: 'Add sheep emoji (#9)',
            sha: 'eebf165c82a4b718d95c11b3877e365b1949ff28',
          },
          sourcePullRequest: {
            number: 9,
            url: 'https://github.com/backport-org/backport-e2e/pull/9',
            mergeCommit: {
              message: 'Add sheep emoji (#9)',
              sha: 'eebf165c82a4b718d95c11b3877e365b1949ff28',
            },
          },
          sourceBranch: 'master',
          expectedTargetPullRequests: [
            {
              branch: '7.8',
              state: 'OPEN',
              number: 10,
              url: 'https://github.com/backport-org/backport-e2e/pull/10',
            },
          ],
        },
        {
          author: { email: 'sorenlouv@gmail.com', name: 'Søren Louv-Jansen' },
          sourceCommit: {
            committedDate: '2020-08-15T12:40:19Z',
            message: 'Add 🍏 emoji (#5)',
            sha: 'ee8c492334cef1ca077a56addb79a26f79821d2f',
          },
          sourcePullRequest: {
            number: 5,
            url: 'https://github.com/backport-org/backport-e2e/pull/5',
            mergeCommit: {
              message: 'Add 🍏 emoji (#5)',
              sha: 'ee8c492334cef1ca077a56addb79a26f79821d2f',
            },
          },
          sourceBranch: 'master',
          expectedTargetPullRequests: [
            {
              branch: '7.x',
              state: 'MERGED',
              number: 6,
              url: 'https://github.com/backport-org/backport-e2e/pull/6',
              mergeCommit: {
                message: 'Add 🍏 emoji (#5) (#6)',
                sha: '4bcd876d4ceaa73cf437bfc89b74d1a4e704c0a6',
              },
            },
            {
              branch: '7.8',
              state: 'MERGED',
              number: 7,
              url: 'https://github.com/backport-org/backport-e2e/pull/7',
              mergeCommit: {
                message: 'Add 🍏 emoji (#5) (#7)',
                sha: '46cd6f9999effdf894a36dbc7db90e890f4be840',
              },
            },
          ],
        },
      ];

      expect(await fetchPullRequestBySearchQuery(options)).toEqual(
        expectedCommits
      );
    });
  });
});
