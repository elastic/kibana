import nock from 'nock';
import { BackportOptions } from '../../../options/options';
import { addAssigneesToPullRequest } from './addAssigneesToPullRequest';

describe('addAssigneesToPullRequest', () => {
  it('should add assignees to PR', async () => {
    const pullNumber = 216;
    const assignees = ['sqren'];

    const scope = nock('https://api.github.com')
      .post('/repos/sqren/backport-demo/issues/216/assignees', {
        assignees: ['sqren'],
      })
      .reply(200, 'some response');

    const res = await addAssigneesToPullRequest(
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

    expect(res).toBe(undefined);
    scope.done();
  });
});
