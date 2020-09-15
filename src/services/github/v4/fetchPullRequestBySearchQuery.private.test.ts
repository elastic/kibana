import { ValidConfigOptions } from '../../../options/options';
import { getDevAccessToken } from '../../../test/private/getDevAccessToken';
import { fetchPullRequestBySearchQuery } from './fetchPullRequestBySearchQuery';

describe('fetchPullRequestBySearchQuery', () => {
  let devAccessToken: string;

  beforeAll(async () => {
    devAccessToken = await getDevAccessToken();
  });

  describe('when filter does not match any PRs', () => {
    it('throws an error', async () => {
      const options = {
        accessToken: devAccessToken,
        all: false,
        author: 'sqren',
        githubApiBaseUrlV4: 'https://api.github.com/graphql',
        maxNumber: 10,
        prFilter: 'label:non-existing',
        repoName: 'backport-e2e',
        repoOwner: 'backport-org',
        sourceBranch: 'master',
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
        all: false,
        author: 'sqren',
        githubApiBaseUrlV4: 'https://api.github.com/graphql',
        maxNumber: 10,
        prFilter: 'label:v7.8.0',
        repoName: 'backport-e2e',
        repoOwner: 'backport-org',
        sourceBranch: 'master',
      } as ValidConfigOptions;

      expect(await fetchPullRequestBySearchQuery(options)).toEqual([
        {
          existingTargetPullRequests: [
            { branch: '7.8', state: 'OPEN', number: 10 },
          ],
          formattedMessage: 'Add sheep emoji (#9)',
          originalMessage: 'Add sheep emoji (#9)',
          pullNumber: 9,
          sha: 'eebf165c82a4b718d95c11b3877e365b1949ff28',
          sourceBranch: 'master',
          targetBranchesFromLabels: [],
        },
        {
          existingTargetPullRequests: [
            { branch: '7.x', state: 'MERGED', number: 6 },
            { branch: '7.8', state: 'MERGED', number: 7 },
          ],
          formattedMessage: 'Add 🍏 emoji (#5)',
          originalMessage: 'Add 🍏 emoji (#5)',
          pullNumber: 5,
          sha: 'ee8c492334cef1ca077a56addb79a26f79821d2f',
          sourceBranch: 'master',
          targetBranchesFromLabels: [],
        },
      ]);
    });
  });
});
