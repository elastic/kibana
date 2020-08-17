import { BackportOptions } from '../../../options/options';
import { getDevAccessToken } from '../../../test/private/getDevAccessToken';
import { fetchExistingPullRequest } from './fetchExistingPullRequest';

describe('fetchExistingPullRequest', () => {
  let devAccessToken: string;

  beforeAll(async () => {
    devAccessToken = await getDevAccessToken();
  });

  describe('when PR does not exist', () => {
    it('returns undefined', async () => {
      const options = {
        repoOwner: 'sqren',
        repoName: 'backport-e2e',
        accessToken: devAccessToken,
        githubApiBaseUrlV4: 'https://api.github.com/graphql',
      } as BackportOptions;
      const res = await fetchExistingPullRequest({
        options,
        backportBranch: 'backport/7.8/pr-9',
        targetBranch: 'master',
      });

      expect(res).toBe(undefined);
    });
  });

  describe('when PR exists', () => {
    it('returns the PR number and url', async () => {
      const options = {
        repoOwner: 'sqren',
        repoName: 'backport-e2e',
        accessToken: devAccessToken,
        githubApiBaseUrlV4: 'https://api.github.com/graphql',
      } as BackportOptions;
      const res = await fetchExistingPullRequest({
        options,
        backportBranch: 'backport/7.8/pr-9',
        targetBranch: '7.8',
      });

      expect(res).toEqual({
        html_url: 'https://github.com/backport-org/backport-e2e/pull/10',
        number: 10,
      });
    });
  });
});
