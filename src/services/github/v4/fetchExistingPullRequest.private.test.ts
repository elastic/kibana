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
        repoName: 'backport-demo',
        accessToken: devAccessToken,
        githubApiBaseUrlV4: 'https://api.github.com/graphql',
      } as BackportOptions;
      const res = await fetchExistingPullRequest({
        options,
        backportBranch: '',
        targetBranch: 'master',
      });

      expect(res).toBe(undefined);
    });
  });

  //  TODO: there are no open PRs to test this on so skipping for now
  // eslint-disable-next-line jest/no-disabled-tests
  describe.skip('when PR exists', () => {
    it('returns the PR number and url', async () => {
      const options = {
        repoOwner: 'sqren',
        repoName: 'backport-demo',
        accessToken: devAccessToken,
        githubApiBaseUrlV4: 'https://api.github.com/graphql',
      } as BackportOptions;
      const res = await fetchExistingPullRequest({
        options,
        backportBranch: '',
        targetBranch: 'master',
      });

      expect(res).toBe({});
    });
  });
});
