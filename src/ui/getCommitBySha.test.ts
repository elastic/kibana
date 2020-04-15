import axios from 'axios';
import { BackportOptions } from '../options/options';
import { commitByShaMock } from '../services/github/v3/mocks/commitByShaMock';
import { CommitSelected } from '../types/Commit';
import { getCommitBySha } from './getCommits';

describe('getCommitBySha', () => {
  it('should return a single commit without PR', async () => {
    const axiosSpy = jest
      .spyOn(axios, 'request')
      .mockResolvedValueOnce({ data: { items: [commitByShaMock] } });

    const commit = await getCommitBySha({
      username: 'sqren',
      accessToken: 'myAccessToken',
      repoOwner: 'elastic',
      repoName: 'kibana',
      sha: 'myCommitSha',
      githubApiBaseUrlV3: 'https://api.github.com',
    } as BackportOptions & { sha: string });

    const expectedCommit: CommitSelected = {
      sourceBranch: 'master',
      formattedMessage:
        '[Chrome] Bootstrap Angular into document.body (myCommit)',
      sha: 'myCommitSha',
      pullNumber: undefined,
      targetBranches: [],
    };

    expect(commit).toEqual(expectedCommit);
    expect(axiosSpy).toHaveBeenCalledWith({
      method: 'get',
      url:
        'https://api.github.com/search/commits?q=hash:myCommitSha%20repo:elastic/kibana&per_page=1',
      headers: { Accept: 'application/vnd.github.cloak-preview' },
      auth: { password: 'myAccessToken', username: 'sqren' },
    });
  });

  it('should throw error if sha does not exist', async () => {
    jest.spyOn(axios, 'request').mockResolvedValueOnce({ data: { items: [] } });

    await expect(
      getCommitBySha({
        repoOwner: 'elastic',
        repoName: 'kibana',
        sha: 'myCommitSha',
        githubApiBaseUrlV3: 'https://api.github.com',
      } as BackportOptions & { sha: string })
    ).rejects.toThrowError('No commit found on master with sha "myCommitSha"');
  });
});
