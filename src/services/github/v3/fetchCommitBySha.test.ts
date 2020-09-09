import nock from 'nock';
import { BackportOptions } from '../../../options/options';
import { CommitSelected } from '../../../types/Commit';
import { fetchCommitBySha } from './fetchCommitBySha';
import { commitByShaMock } from './mocks/commitByShaMock';

type BackportOptionsWithSha = BackportOptions & { sha: string };

describe('fetchCommitBySha', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('should return single commit with pull request', async () => {
    const options = {
      repoOwner: 'elastic',
      repoName: 'kibana',
      sha: 'sha123456789',
      githubApiBaseUrlV3: 'https://api.github.com',
    } as BackportOptionsWithSha;

    // mock commits
    const scope = nock('https://api.github.com')
      .get('/search/commits')
      .query({
        per_page: '1',
        q: 'hash:sha123456789 repo:elastic/kibana',
      })
      .reply(200, {
        items: [{ commit: { message: 'myMessage' }, sha: options.sha }],
      });

    await expect(await fetchCommitBySha(options)).toEqual({
      sourceBranch: 'master',
      formattedMessage: 'myMessage (sha12345)',
      originalMessage: 'myMessage',
      pullNumber: undefined,
      sha: 'sha123456789',
      targetBranchesFromLabels: [],
    });

    scope.done();
  });

  it('should return a single commit without PR', async () => {
    const scope = nock('https://api.github.com')
      .get('/search/commits')
      .query({
        per_page: '1',
        q: 'hash:myCommitSha repo:elastic/kibana',
      })
      .reply(200, { items: [commitByShaMock] });

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
      originalMessage: '[Chrome] Bootstrap Angular into document.body',
      sha: 'myCommitSha',
      pullNumber: undefined,
      targetBranchesFromLabels: [],
    };

    expect(commit).toEqual(expectedCommit);
    scope.done();
  });

  it('should throw error if sha does not exist', async () => {
    const scope = nock('https://api.github.com')
      .get('/search/commits')
      .query({
        per_page: '1',
        q: 'hash:myCommitSha repo:elastic/kibana',
      })
      .reply(200, { items: [] });

    await expect(
      fetchCommitBySha({
        repoOwner: 'elastic',
        repoName: 'kibana',
        sha: 'myCommitSha',
        githubApiBaseUrlV3: 'https://api.github.com',
      } as BackportOptions & { sha: string })
    ).rejects.toThrowError('No commit found on master with sha "myCommitSha"');

    scope.done();
  });
});
