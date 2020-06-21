import axios from 'axios';
import { BackportOptions } from '../../../options/options';
import { addAssigneesToPullRequest } from './addAssigneesToPullRequest';

describe('addAssigneesToPullRequest', () => {
  it('should add assignees to PR', async () => {
    const pullNumber = 216;
    const assignees = ['sqren'];

    const spy = jest
      .spyOn(axios, 'request')
      .mockResolvedValueOnce('some-response');

    await addAssigneesToPullRequest(
      {
        githubApiBaseUrlV3: 'https://api.github.com',
        repoName: 'backport-demo',
        repoOwner: 'sqren',
        accessToken: 'my-token',
        username: 'sqren',
        dryRun: false,
      } as BackportOptions,
      pullNumber,
      assignees
    );

    expect(spy).toHaveBeenCalledWith({
      method: 'post',
      url:
        'https://api.github.com/repos/sqren/backport-demo/issues/216/assignees',
      auth: { username: 'sqren', password: 'my-token' },
      data: { assignees: ['sqren'] },
    });
  });
});
