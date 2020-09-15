import { ValidConfigOptions } from '../../../options/options';
import { getDevAccessToken } from '../../../test/private/getDevAccessToken';
import { fetchDefaultRepoBranchAndPerformStartupChecks } from './fetchDefaultRepoBranchAndPerformStartupChecks';

describe('fetchDefaultRepoBranchAndPerformStartupChecks', () => {
  let devAccessToken: string;

  beforeAll(async () => {
    devAccessToken = await getDevAccessToken();
  });

  describe('accessToken is invalid', () => {
    it('throws an error', async () => {
      const options = {
        accessToken: 'foo',
        githubApiBaseUrlV4: 'https://api.github.com/graphql',
        repoName: 'backport-e2e',
        repoOwner: 'backport-org',
      } as ValidConfigOptions;

      await expect(
        fetchDefaultRepoBranchAndPerformStartupChecks(options)
      ).rejects.toThrowError(
        'Please check your access token and make sure it is valid.\nConfig: /myHomeDir/.backport/config.json'
      );
    });
  });

  describe('accessToken is valid', () => {
    it('returns the default branch', async () => {
      const options = {
        accessToken: devAccessToken,
        githubApiBaseUrlV4: 'https://api.github.com/graphql',
        repoName: 'backport-e2e',
        repoOwner: 'backport-org',
      } as ValidConfigOptions;

      expect(
        await fetchDefaultRepoBranchAndPerformStartupChecks(options)
      ).toEqual({ defaultBranch: 'master' });
    });
  });
});
