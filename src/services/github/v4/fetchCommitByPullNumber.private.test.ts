import { ValidConfigOptions } from '../../../options/options';
import { getDevAccessToken } from '../../../test/private/getDevAccessToken';
import { fetchCommitByPullNumber } from './fetchCommitByPullNumber';

describe('fetchCommitByPullNumber', () => {
  let devAccessToken: string;

  beforeAll(async () => {
    devAccessToken = await getDevAccessToken();
  });

  describe('when PR was merged', () => {
    it('is returned', async () => {
      const options = {
        accessToken: devAccessToken,
        githubApiBaseUrlV4: 'https://api.github.com/graphql',
        pullNumber: 5,
        repoName: 'backport-e2e',
        repoOwner: 'backport-org',
      } as ValidConfigOptions & { pullNumber: number };

      expect(await fetchCommitByPullNumber(options)).toEqual({
        formattedMessage: 'Add 🍏 emoji (#5)',
        originalMessage: 'Add 🍏 emoji (#5)',
        pullNumber: 5,
        sha: 'ee8c492334cef1ca077a56addb79a26f79821d2f',
        sourceBranch: 'master',
        targetBranchesFromLabels: [],
        existingTargetPullRequests: [
          { branch: '7.x', state: 'MERGED', number: 6 },
          { branch: '7.8', state: 'MERGED', number: 7 },
        ],
      });
    });
  });

  describe('when PR is still open', () => {
    it('throws an error', async () => {
      const options = {
        accessToken: devAccessToken,
        githubApiBaseUrlV4: 'https://api.github.com/graphql',
        pullNumber: 11,
        repoName: 'backport-e2e',
        repoOwner: 'backport-org',
      } as ValidConfigOptions & { pullNumber: number };

      await expect(fetchCommitByPullNumber(options)).rejects.toThrowError(
        `The PR #11 is not merged`
      );
    });
  });

  describe('when PR does not exist', () => {
    it('throws an error', async () => {
      const options = {
        accessToken: devAccessToken,
        githubApiBaseUrlV4: 'https://api.github.com/graphql',
        pullNumber: 9999999999999,
        repoName: 'backport-e2e',
        repoOwner: 'backport-org',
      } as ValidConfigOptions & { pullNumber: number };

      await expect(fetchCommitByPullNumber(options)).rejects.toThrowError(
        `Could not resolve to a PullRequest with the number of 9999999999999. (Github v4)`
      );
    });
  });
});
