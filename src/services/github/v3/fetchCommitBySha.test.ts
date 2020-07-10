import axios from 'axios';
import { BackportOptions } from '../../../options/options';
import { CommitSelected } from '../../../types/Commit';
import { fetchCommitBySha } from './fetchCommitBySha';
import { commitByShaMock } from './mocks/commitByShaMock';

describe('fetchCommitBySha', () => {
  it('should return single commit with pull request', async () => {
    const commitSha = 'sha123456789';
    const options = {
      repoOwner: 'elastic',
      repoName: 'kibana',
      accessToken: 'myAccessToken',
      username: 'sqren',
      author: 'sqren',
      githubApiBaseUrlV3: 'https://api.github.com',
    } as BackportOptions;

    const axiosSpy = jest
      .spyOn(axios, 'request')

      // mock commits
      .mockResolvedValueOnce({
        data: { items: [{ commit: { message: 'myMessage' }, sha: commitSha }] },
      });

    await expect(
      await fetchCommitBySha({ ...options, sha: commitSha })
    ).toEqual({
      sourceBranch: 'master',
      formattedMessage: 'myMessage (sha12345)',
      pullNumber: undefined,
      sha: 'sha123456789',
      targetBranchesFromLabels: [],
    });

    expect(axiosSpy.mock.calls).toMatchSnapshot();
  });

  it('should return a single commit without PR', async () => {
    const axiosSpy = jest
      .spyOn(axios, 'request')
      .mockResolvedValueOnce({ data: { items: [commitByShaMock] } });

    const commit = await fetchCommitBySha({
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
      targetBranchesFromLabels: [],
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
      fetchCommitBySha({
        repoOwner: 'elastic',
        repoName: 'kibana',
        sha: 'myCommitSha',
        githubApiBaseUrlV3: 'https://api.github.com',
      } as BackportOptions & { sha: string })
    ).rejects.toThrowError('No commit found on master with sha "myCommitSha"');
  });
});
