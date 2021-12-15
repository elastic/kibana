import nock from 'nock';
import { ValidConfigOptions } from '../../../../options/options';
import { mockGqlRequest } from '../../../../test/nockHelpers';
import { Commit } from '../../../sourceCommit';
import { AuthorIdResponse } from '../fetchAuthorId';
import { commitsByAuthorMock } from '../mocks/commitsByAuthorMock';
import {
  CommitByAuthorResponse,
  fetchCommitsByAuthor,
} from './fetchCommitsByAuthor';

const defaultOptions = {
  repoOwner: 'elastic',
  repoName: 'kibana',
  sourceBranch: 'source-branch-from-options',
  accessToken: 'myAccessToken',
  username: 'sqren',
  author: 'sqren',
  maxNumber: 10,
  githubApiBaseUrlV3: 'https://api.github.com',
  githubApiBaseUrlV4: 'http://localhost/graphql',
  commitPaths: [] as Array<string>,
} as ValidConfigOptions;

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
          committedDate: '2021-12-24T00:00:00Z',
          sha: '2e63475c483f7844b0f2833bc57fdee32095bacb',
          formattedMessage: 'Add 👻 (2e63475c)',
          originalMessage: 'Add 👻',
          existingTargetPullRequests: [],
          targetBranchesFromLabels: {
            expected: [],
            missing: [],
            unmerged: [],
            merged: [],
          },
          sourceBranch: 'source-branch-from-options',
        },
        {
          committedDate: '2021-12-23T00:00:00Z',
          sha: 'f3b618b9421fdecdb36862f907afbdd6344b361d',
          formattedMessage: 'Add witch (#85)',
          originalMessage: 'Add witch (#85)',
          pullNumber: 85,
          existingTargetPullRequests: [],
          targetBranchesFromLabels: {
            expected: [],
            missing: [],
            unmerged: [],
            merged: [],
          },
          sourceBranch: 'master',
        },
        {
          committedDate: '2021-12-22T00:00:00Z',
          sha: '79cf18453ec32a4677009dcbab1c9c8c73fc14fe',
          formattedMessage: 'Add SF mention (#80)',
          originalMessage:
            'Add SF mention (#80)\n\n* Add SF mention\r\n\r\n* Add several emojis!',
          pullNumber: 80,
          existingTargetPullRequests: [
            { branch: '6.3', state: 'MERGED', number: 99 },
          ],
          targetBranchesFromLabels: {
            expected: [],
            missing: [],
            unmerged: [],
            merged: [],
          },
          sourceBranch: 'master',
        },
        {
          committedDate: '2021-12-21T00:00:00Z',
          sha: '3827bbbaf39914eda4f02f6940189844375fd097',
          formattedMessage: 'Add backport config (3827bbba)',
          originalMessage: 'Add backport config',
          existingTargetPullRequests: [],
          targetBranchesFromLabels: {
            expected: [],
            missing: [],
            unmerged: [],
            merged: [],
          },
          sourceBranch: 'source-branch-from-options',
        },
        {
          committedDate: '2021-12-20T00:00:00Z',
          sha: '5ea0da550ac191029459289d67f99ad7d310812b',
          formattedMessage: 'Initial commit (5ea0da55)',
          originalMessage: 'Initial commit',
          existingTargetPullRequests: [],
          targetBranchesFromLabels: {
            expected: [],
            missing: [],
            unmerged: [],
            merged: [],
          },
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
