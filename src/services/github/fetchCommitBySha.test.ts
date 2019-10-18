import axios from 'axios';
import { fetchCommitBySha } from './fetchCommitBySha';
import { BackportOptions } from '../../options/options';

describe('fetchCommitBySha', () => {
  it('should return single commit with pull request', async () => {
    const commitSha = 'sha123456789';
    const options = {
      repoOwner: 'elastic',
      repoName: 'kibana',
      accessToken: 'myAccessToken',
      username: 'sqren',
      author: 'sqren',
      apiHostname: 'api.github.com'
    } as BackportOptions;

    const axiosSpy = jest
      .spyOn(axios, 'get')

      // mock commits
      .mockResolvedValueOnce({
        data: { items: [{ commit: { message: 'myMessage' }, sha: commitSha }] }
      });

    expect(await fetchCommitBySha({ ...options, sha: commitSha })).toEqual({
      branch: 'master',
      message: 'myMessage (sha12345)',
      pullNumber: undefined,
      sha: 'sha123456789'
    });

    expect(axiosSpy.mock.calls).toMatchSnapshot();
  });
});
