import { ValidConfigOptions } from '../../../options/options';
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
        accessToken: devAccessToken,
        githubApiBaseUrlV4: 'https://api.github.com/graphql',
      } as ValidConfigOptions;

      const prPayload = {
        owner: 'backport-org',
        repo: 'backport-e2e',
        title: 'My PR title',
        body: 'My PR body',
        head: 'sqren:backport/7.8/pr-foo',
        base: '7.8',
      };

      const res = await fetchExistingPullRequest({ options, prPayload });

      expect(res).toBe(undefined);
    });
  });

  describe('when PR exists', () => {
    it('returns the PR number and url', async () => {
      const options = {
        accessToken: devAccessToken,
        githubApiBaseUrlV4: 'https://api.github.com/graphql',
      } as ValidConfigOptions;

      const prPayload = {
        owner: 'backport-org',
        repo: 'backport-e2e',
        title: 'My PR title',
        body: 'My PR body',
        head: 'sqren:backport/7.8/pr-9',
        base: '7.8',
      };
      const res = await fetchExistingPullRequest({ options, prPayload });

      expect(res).toEqual({
        url: 'https://github.com/backport-org/backport-e2e/pull/10',
        number: 10,
      });
    });
  });
});
