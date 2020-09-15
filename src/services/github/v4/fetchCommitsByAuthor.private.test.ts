import { ValidConfigOptions } from '../../../options/options';
import { getDevAccessToken } from '../../../test/private/getDevAccessToken';
import { PromiseReturnType } from '../../../types/PromiseReturnType';
import { fetchCommitsByAuthor } from './fetchCommitsByAuthor';

describe('fetchCommitsByAuthor', () => {
  let devAccessToken: string;

  beforeAll(async () => {
    devAccessToken = await getDevAccessToken();
  });

  describe('existingTargetPullRequests', () => {
    let res: PromiseReturnType<typeof fetchCommitsByAuthor>;
    beforeEach(async () => {
      res = await fetchCommitsByAuthor({
        repoOwner: 'backport-org',
        repoName: 'backport-e2e',
        sourceBranch: 'master',
        accessToken: devAccessToken,
        username: 'sqren',
        author: 'sqren',
        maxNumber: 10,
        githubApiBaseUrlV4: 'https://api.github.com/graphql',
      } as ValidConfigOptions);
    });

    it('returns related OPEN PRs', async () => {
      const commitWithOpenPR = res.find((commit) => commit.pullNumber === 9);
      expect(commitWithOpenPR?.existingTargetPullRequests).toEqual([
        { branch: '7.8', state: 'OPEN', number: 10 },
      ]);
    });

    it('returns related MERGED PRs', async () => {
      const commitWithMergedPRs = res.find((commit) => commit.pullNumber === 5);
      expect(commitWithMergedPRs?.existingTargetPullRequests).toEqual([
        { branch: '7.x', state: 'MERGED', number: 6 },
        { branch: '7.8', state: 'MERGED', number: 7 },
      ]);
    });

    it('returns empty if there are no related PRs', async () => {
      const commitWithoutPRs = res.find((commit) => commit.pullNumber === 8);
      expect(commitWithoutPRs?.existingTargetPullRequests).toEqual([]);
    });
  });
});
