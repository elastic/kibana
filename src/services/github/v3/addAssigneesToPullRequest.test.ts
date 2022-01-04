import nock from 'nock';
import { ValidConfigOptions } from '../../../options/options';
import { addAssigneesToPullRequest } from './addAssigneesToPullRequest';

describe('addAssigneesToPullRequest', () => {
  it('should add assignees to PR', async () => {
    const pullNumber = 216;
    const assignees = ['sqren'];

    const scope = nock('https://api.github.com')
      .post('/repos/elastic/kibana/issues/216/assignees', {
        assignees: ['sqren'],
      })
      .reply(200, 'some response');

    const res = await addAssigneesToPullRequest(
      {
        author: 'sqren',
        repoName: 'kibana',
        repoOwner: 'elastic',
        accessToken: 'my-token',
      } as ValidConfigOptions,
      pullNumber,
      assignees
    );

    expect(res).toBe(undefined);
    scope.done();
    nock.cleanAll();
  });
});
