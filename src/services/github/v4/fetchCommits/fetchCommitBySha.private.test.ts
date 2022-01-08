import gql from 'graphql-tag';
import { getDevAccessToken } from '../../../../test/private/getDevAccessToken';
import { Commit } from '../../../sourceCommit/parseSourceCommit';
import * as apiRequestV4Module from '../apiRequestV4';
import { fetchCommitBySha } from './fetchCommitBySha';

describe('fetchCommitBySha', () => {
  let devAccessToken: string;

  beforeEach(async () => {
    devAccessToken = await getDevAccessToken();
  });

  describe('snapshot request/response', () => {
    let spy: jest.SpyInstance;
    let commit: Commit;

    beforeEach(async () => {
      spy = jest.spyOn(apiRequestV4Module, 'apiRequestV4');

      commit = await fetchCommitBySha({
        repoOwner: 'elastic',
        repoName: 'kibana',
        accessToken: devAccessToken,
        sha: 'd421ddcf6157150596581c7885afa3690cec6339',
        sourceBranch: 'main',
        historicalBranchLabelMappings: [],
      });
    });

    it('makes the right queries', () => {
      const queries = spy.mock.calls.reduce((acc, call) => {
        const query = call[0].query;
        const ast = gql(query);
        //@ts-expect-error
        const name = ast.definitions[0].name.value;
        return { ...acc, [name]: query };
      }, {});

      const queryNames = Object.keys(queries);
      expect(queryNames).toEqual(['CommitsBySha']);
      queryNames.forEach((name) => {
        expect(queries[name]).toMatchSnapshot(`Query: ${name}`);
      });
    });

    it('returns the correct response', async () => {
      expect(commit).toMatchSnapshot();
    });
  });

  it('should return single commit with pull request', async () => {
    await expect(
      await fetchCommitBySha({
        repoOwner: 'elastic',
        repoName: 'kibana',
        accessToken: devAccessToken,
        sha: 'cb6fbc0',
        sourceBranch: 'master',
        historicalBranchLabelMappings: [],
      })
    ).toEqual({
      committedDate: '2020-07-07T20:40:28Z',
      originalMessage: '[APM] Add API tests (#70740)',
      pullNumber: 70740,
      pullUrl: 'https://github.com/elastic/kibana/pull/70740',
      sha: 'cb6fbc0e1b406675724181a3e9f59459b5f8f892',
      sourceBranch: 'master',
      expectedTargetPullRequests: [
        {
          branch: '7.x',
          state: 'MERGED',
          number: 71014,
          url: 'https://github.com/elastic/kibana/pull/71014',
          mergeCommit: {
            message: '[APM] Add API tests (#70740) (#71014)',
            sha: 'd15242be682582e58cd69f6b7707565434e99293',
          },
        },
      ],
    });
  });

  it('throws if sha does not exist', async () => {
    await expect(
      fetchCommitBySha({
        repoOwner: 'elastic',
        repoName: 'kibana',
        accessToken: devAccessToken,
        sha: 'fc22f59',
        sourceBranch: 'main',
        historicalBranchLabelMappings: [],
      })
    ).rejects.toThrowError(
      'No commit found on branch "main" with sha "fc22f59"'
    );
  });

  it('throws if sha is invalid', async () => {
    await expect(
      fetchCommitBySha({
        repoOwner: 'elastic',
        repoName: 'kibana',
        accessToken: devAccessToken,
        sha: 'myCommitSha',
        sourceBranch: 'main',
        historicalBranchLabelMappings: [],
      })
    ).rejects.toThrowError(
      'No commit found on branch "main" with sha "myCommitSha"'
    );
  });
});
