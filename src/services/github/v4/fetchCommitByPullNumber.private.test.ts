import { BackportOptions } from '../../../options/options';
import { getDevAccessToken } from '../../../test/private/getDevAccessToken';
import { fetchCommitByPullNumber } from './fetchCommitByPullNumber';

describe('fetchCommitByPullNumber', () => {
  let devAccessToken: string;

  beforeAll(async () => {
    devAccessToken = await getDevAccessToken();
  });

  describe('when PR exists', () => {
    it('throws an error', async () => {
      const options = {
        accessToken: devAccessToken,
        githubApiBaseUrlV4: 'https://api.github.com/graphql',
        pullNumber: 85,
        repoName: 'backport-demo',
        repoOwner: 'sqren',
      } as BackportOptions & { pullNumber: number };

      expect(await fetchCommitByPullNumber(options)).toEqual({
        formattedMessage: 'Add witch (#85)',
        pullNumber: 85,
        sha: 'f3b618b9421fdecdb36862f907afbdd6344b361d',
        sourceBranch: 'master',
        targetBranchesFromLabels: [],
      });
    });
  });

  describe('when PR has not been merged', () => {
    it('throws an error', async () => {
      const options = {
        accessToken: devAccessToken,
        githubApiBaseUrlV4: 'https://api.github.com/graphql',
        pullNumber: 123,
        repoName: 'backport-demo',
        repoOwner: 'sqren',
      } as BackportOptions & { pullNumber: number };

      await expect(fetchCommitByPullNumber(options)).rejects.toThrowError(
        `The PR #123 is not merged`
      );
    });
  });

  describe('when PR does not exist', () => {
    it('throws an error', async () => {
      const options = {
        accessToken: devAccessToken,
        githubApiBaseUrlV4: 'https://api.github.com/graphql',
        pullNumber: 9999999999999,
        repoName: 'backport-demo',
        repoOwner: 'sqren',
      } as BackportOptions & { pullNumber: number };

      await expect(fetchCommitByPullNumber(options)).rejects.toThrowError(
        `Could not resolve to a PullRequest with the number of 9999999999999. (Github v4)`
      );
    });
  });
});
