import nock from 'nock';
import { mockGqlRequest } from '../../../../test/nockHelpers';
import { Commit } from '../../../sourceCommit/parseSourceCommit';
import { AuthorIdResponse } from '../fetchAuthorId';
import { commitsByAuthorMock } from '../mocks/commitsByAuthorMock';
import {
  CommitByAuthorResponse,
  fetchCommitsByAuthor,
} from './fetchCommitsByAuthor';

const defaultOptions = {
  accessToken: 'myAccessToken',
  author: 'sqren',
  githubApiBaseUrlV4: 'http://localhost/graphql',
  maxNumber: 10,
  repoName: 'kibana',
  repoOwner: 'elastic',
  sourceBranch: 'source-branch-from-options',
  dateSince: null,
  dateUntil: null,
};

const authorIdMockData = { user: { id: 'myUserId' } } as const;

describe('fetchCommitsByAuthor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('when commit has an associated pull request', () => {
    let res: Commit[];
    let authorIdCalls: ReturnType<typeof mockGqlRequest>;
    let commitsByAuthorCalls: ReturnType<typeof mockGqlRequest>;

    beforeEach(async () => {
      authorIdCalls = mockGqlRequest<AuthorIdResponse>({
        name: 'AuthorId',
        statusCode: 200,
        body: { data: authorIdMockData },
      });

      commitsByAuthorCalls = mockGqlRequest<CommitByAuthorResponse>({
        name: 'CommitsByAuthor',
        statusCode: 200,
        body: { data: commitsByAuthorMock },
      });

      res = await fetchCommitsByAuthor(defaultOptions);
    });

    it('should return a list of commits with pullNumber and existing backports', () => {
      const expectedCommits: Commit[] = [
        {
          author: { email: 'soren.louv@elastic.co', name: 'Søren Louv-Jansen' },
          sourceCommit: {
            committedDate: '2021-12-24T00:00:00Z',
            sha: '2e63475c483f7844b0f2833bc57fdee32095bacb',
            message: 'Add 👻',
          },
          expectedTargetPullRequests: [],
          sourceBranch: 'source-branch-from-options',
        },
        {
          author: { email: 'soren.louv@elastic.co', name: 'Søren Louv-Jansen' },
          sourceCommit: {
            committedDate: '2021-12-23T00:00:00Z',
            sha: 'f3b618b9421fdecdb36862f907afbdd6344b361d',
            message: 'Add witch (#85)',
          },
          sourcePullRequest: {
            number: 85,
            url: 'https://github.com/elastic/kibana/pull/85',
            mergeCommit: {
              sha: 'f3b618b9421fdecdb36862f907afbdd6344b361d',
              message: 'Add witch (#85)',
            },
          },
          expectedTargetPullRequests: [],
          sourceBranch: 'master',
        },
        {
          author: { email: 'soren.louv@elastic.co', name: 'Søren Louv-Jansen' },
          sourceCommit: {
            committedDate: '2021-12-22T00:00:00Z',
            sha: '79cf18453ec32a4677009dcbab1c9c8c73fc14fe',
            message:
              'Add SF mention (#80)\n\n* Add SF mention\r\n\r\n* Add several emojis!',
          },
          sourcePullRequest: {
            number: 80,
            url: 'https://github.com/elastic/kibana/pull/80',
            mergeCommit: {
              sha: '79cf18453ec32a4677009dcbab1c9c8c73fc14fe',
              message:
                'Add SF mention (#80)\n\n* Add SF mention\r\n\r\n* Add several emojis!',
            },
          },
          expectedTargetPullRequests: [
            {
              branch: '6.3',
              state: 'MERGED',
              number: 99,
              url: 'https://github.com/elastic/kibana/pull/99',
              mergeCommit: {
                message:
                  'Add SF mention (#80)\n\n* Add SF mention\r\n\r\n* Add several emojis!',
                sha: 'target-merge-commit-sha',
              },
            },
          ],
          sourceBranch: 'master',
        },
        {
          author: { email: 'soren.louv@elastic.co', name: 'Søren Louv-Jansen' },
          sourceCommit: {
            committedDate: '2021-12-21T00:00:00Z',
            sha: '3827bbbaf39914eda4f02f6940189844375fd097',
            message: 'Add backport config',
          },
          expectedTargetPullRequests: [],
          sourceBranch: 'source-branch-from-options',
        },
        {
          author: { email: 'soren.louv@elastic.co', name: 'Søren Louv-Jansen' },
          sourceCommit: {
            committedDate: '2021-12-20T00:00:00Z',
            sha: '5ea0da550ac191029459289d67f99ad7d310812b',
            message: 'Initial commit',
          },
          expectedTargetPullRequests: [],
          sourceBranch: 'source-branch-from-options',
        },
      ];
      expect(res).toEqual(expectedCommits);
    });

    it('should call with correct args to fetch author id', () => {
      expect(authorIdCalls).toMatchSnapshot();
    });

    it('should call with correct args to fetch commits', () => {
      expect(commitsByAuthorCalls).toMatchSnapshot();
    });
  });

  describe('when a custom github api hostname is supplied', () => {
    it('should be used in gql requests', async () => {
      const authorIdCalls = mockGqlRequest<AuthorIdResponse>({
        name: 'AuthorId',
        statusCode: 200,
        body: { data: authorIdMockData },
        apiBaseUrl: 'http://localhost/my-custom-api',
      });

      const commitsByAuthorCalls = mockGqlRequest<CommitByAuthorResponse>({
        name: 'CommitsByAuthor',
        statusCode: 200,
        body: { data: commitsByAuthorMock },
        apiBaseUrl: 'http://localhost/my-custom-api',
      });

      await fetchCommitsByAuthor({
        ...defaultOptions,
        githubApiBaseUrlV4: 'http://localhost/my-custom-api',
      });

      expect(authorIdCalls.length).toBe(1);
      expect(commitsByAuthorCalls.length).toBe(1);
    });
  });
});
