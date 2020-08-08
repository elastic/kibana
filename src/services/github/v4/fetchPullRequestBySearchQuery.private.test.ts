import { BackportOptions } from '../../../options/options';
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
        repoName: 'backport-demo',
        repoOwner: 'sqren',
        sourceBranch: 'master',
      } as BackportOptions;

      await expect(fetchPullRequestBySearchQuery(options)).rejects.toThrowError(
        'There are no commits by "sqren" matching the filter "label:non-existing". Try with `--all` for commits by all users or `--author=<username>` for commits from a specific user'
      );
    });
  });

  describe('when filter matches at least one PR', () => {
    it('throws an error', async () => {
      const options = {
        accessToken: devAccessToken,
        all: false,
        author: 'sqren',
        githubApiBaseUrlV4: 'https://api.github.com/graphql',
        maxNumber: 10,
        prFilter: 'label:6.3',
        repoName: 'backport-demo',
        repoOwner: 'sqren',
        sourceBranch: 'master',
      } as BackportOptions;

      expect(await fetchPullRequestBySearchQuery(options)).toEqual([
        {
          existingTargetPullRequests: [],
          formattedMessage: 'Add branch label mapping (#225)',
          pullNumber: 225,
          sha: 'f287d1ea35ae9ec6b45394c5c40b76c1f2cfa79d',
          sourceBranch: 'master',
          targetBranchesFromLabels: [],
        },
        {
          existingTargetPullRequests: [],
          formattedMessage: 'Deleted Bernado line (#223)',
          pullNumber: 223,
          sha: '176b2df25726dfd995dccc9b633d81fc6baf3e91',
          sourceBranch: 'master',
          targetBranchesFromLabels: [],
        },
      ]);
    });
  });
});
