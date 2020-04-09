import axios from 'axios';
import { BackportOptions } from '../../../options/options';
import { fetchCommitBySha } from './fetchCommitBySha';

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
      branch: 'master',
      formattedMessage: 'myMessage (sha12345)',
      pullNumber: undefined,
      sha: 'sha123456789',
    });

    expect(axiosSpy.mock.calls).toMatchSnapshot();
  });
});
