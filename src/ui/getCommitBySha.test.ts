import axios from 'axios';
import httpAdapter from 'axios/lib/adapters/http';
import { getCommitBySha } from './getCommits';
import { BackportOptions } from '../options/options';
import { commitByShaMock } from '../services/github/mocks/commitByShaMock';

axios.defaults.adapter = httpAdapter;

describe('getCommitBySha', () => {
  it('should return a single commit without PR', async () => {
    const axiosSpy = mockCommitItems([commitByShaMock]);
    const commit = await getCommitBySha({
      username: 'sqren',
      accessToken: 'myAccessToken',
      repoOwner: 'elastic',
      repoName: 'kibana',
      sha: 'myCommitSha',
      githubApiBaseUrlV3: 'https://api.github.com',
    } as BackportOptions & { sha: string });

    expect(commit).toEqual({
      branch: 'master',
      message: '[Chrome] Bootstrap Angular into document.body (myCommit)',
      sha: 'myCommitSha',
      pullNumber: undefined,
    });

    expect(axiosSpy).toHaveBeenCalledWith(
      'https://api.github.com/search/commits?q=hash:myCommitSha%20repo:elastic/kibana&per_page=1',
      {
        headers: { Accept: 'application/vnd.github.cloak-preview' },
        auth: { password: 'myAccessToken', username: 'sqren' },
      }
    );
  });

  it('should throw error if sha does not exist', async () => {
    mockCommitItems([]);

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

function mockCommitItems(items: any) {
  return jest.spyOn(axios, 'get').mockResolvedValue({ data: { items } });
}
