import nock from 'nock';
import { BackportOptions } from '../../../options/options';
import { mockGqlRequest } from '../../../test/nockHelpers';
import { CommitSelected, CommitChoice } from '../../../types/Commit';
import {
  fetchCommitsByAuthor,
  getExistingTargetPullRequests,
} from './fetchCommitsByAuthor';
import { commitsWithPullRequestsMock } from './mocks/commitsByAuthorMock';
import { getCommitsByAuthorMock } from './mocks/getCommitsByAuthorMock';
import { getPullRequestEdgeMock } from './mocks/getPullRequestEdgeMock';

const defaultOptions = {
  repoOwner: 'elastic',
  repoName: 'kibana',
  sourceBranch: 'master',
  accessToken: 'myAccessToken',
  username: 'sqren',
  author: 'sqren',
  maxNumber: 10,
  githubApiBaseUrlV3: 'https://api.github.com',
  githubApiBaseUrlV4: 'http://localhost/graphql',
} as BackportOptions;

const authorIdMockData = { user: { id: 'myUserId' } } as const;

describe('fetchCommitsByAuthor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('when commit has an associated pull request', () => {
    let res: CommitSelected[];
    let authorIdCalls: ReturnType<typeof mockGqlRequest>;
    let commitsByAuthorCalls: ReturnType<typeof mockGqlRequest>;

    beforeEach(async () => {
      authorIdCalls = mockGqlRequest({
        name: 'AuthorId',
        statusCode: 200,
        body: { data: authorIdMockData },
      });

      commitsByAuthorCalls = mockGqlRequest({
        name: 'CommitsByAuthor',
        statusCode: 200,
        body: { data: commitsWithPullRequestsMock },
      });

      res = await fetchCommitsByAuthor(defaultOptions);
    });

    it('Should return a list of commits with pullNumber and existing backports', () => {
      const expectedCommits: CommitChoice[] = [
        {
          sha: '2e63475c483f7844b0f2833bc57fdee32095bacb',
          formattedMessage: 'Add 👻 (2e63475c)',
          originalMessage: 'Add 👻',
          existingTargetPullRequests: [],
          targetBranchesFromLabels: [],
          sourceBranch: 'master',
        },
        {
          sha: 'f3b618b9421fdecdb36862f907afbdd6344b361d',
          formattedMessage: 'Add witch (#85)',
          originalMessage: 'Add witch (#85)',
          pullNumber: 85,
          existingTargetPullRequests: [],
          targetBranchesFromLabels: [],
          sourceBranch: 'master',
        },
        {
          sha: '79cf18453ec32a4677009dcbab1c9c8c73fc14fe',
          formattedMessage: 'Add SF mention (#80)',
          originalMessage:
            'Add SF mention (#80)\n\n* Add SF mention\r\n\r\n* Add several emojis!',
          pullNumber: 80,
          existingTargetPullRequests: [{ branch: '6.3', state: 'MERGED' }],
          targetBranchesFromLabels: [],
          sourceBranch: 'master',
        },
        {
          sha: '3827bbbaf39914eda4f02f6940189844375fd097',
          formattedMessage: 'Add backport config (3827bbba)',
          originalMessage: 'Add backport config',
          existingTargetPullRequests: [],
          targetBranchesFromLabels: [],
          sourceBranch: 'master',
        },
        {
          sha: '5ea0da550ac191029459289d67f99ad7d310812b',
          formattedMessage: 'Initial commit (5ea0da55)',
          originalMessage: 'Initial commit',
          existingTargetPullRequests: [],
          targetBranchesFromLabels: [],
          sourceBranch: 'master',
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

  describe('existingTargetPullRequests', () => {
    it('should return existingTargetPullRequests when repoNames match', async () => {
      const res = await getExistingBackportsByRepoName('kibana', 'kibana');
      const expectedCommits: CommitChoice[] = [
        {
          existingTargetPullRequests: [{ branch: '6.3', state: 'MERGED' }],
          formattedMessage: 'Add SF mention (#80)',
          originalMessage:
            'Add SF mention (#80)\n\n* Add SF mention\r\n\r\n* Add several emojis!',
          pullNumber: 80,
          sha: '79cf18453ec32a4677009dcbab1c9c8c73fc14fe',
          sourceBranch: 'master',
          targetBranchesFromLabels: [],
        },
      ];
      expect(res).toEqual(expectedCommits);
    });

    it('should not return existingTargetPullRequests when repoNames does not match', async () => {
      const res = await getExistingBackportsByRepoName('kibana', 'kibana2');
      const expectedCommits: CommitChoice[] = [
        {
          existingTargetPullRequests: [],
          formattedMessage: 'Add SF mention (#80)',
          originalMessage:
            'Add SF mention (#80)\n\n* Add SF mention\r\n\r\n* Add several emojis!',
          pullNumber: 80,
          sha: '79cf18453ec32a4677009dcbab1c9c8c73fc14fe',
          sourceBranch: 'master',
          targetBranchesFromLabels: [],
        },
      ];
      expect(res).toEqual(expectedCommits);
    });
  });

  describe('when a custom github api hostname is supplied', () => {
    it('should be used in gql requests', async () => {
      const authorIdCalls = mockGqlRequest({
        name: 'AuthorId',
        statusCode: 200,
        body: { data: authorIdMockData },
        apiBaseUrl: 'http://localhost/my-custom-api',
      });

      const commitsByAuthorCalls = mockGqlRequest({
        name: 'CommitsByAuthor',
        statusCode: 200,
        body: { data: commitsWithPullRequestsMock },
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

describe('getExistingTargetPullRequests', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('should return a result when commit messages match', () => {
    const commitMessage = 'my message (#1234)';
    const pullRequestEdge = getPullRequestEdgeMock({
      pullRequestNumber: 1234,
      timelinePullRequest: {
        title: 'a pr title',
        commits: ['my message (#1234)'],
      },
    });
    const existingPRs = getExistingTargetPullRequests(
      commitMessage,
      pullRequestEdge
    );
    expect(existingPRs).toEqual([{ branch: '7.x', state: 'MERGED' }]);
  });

  it('should not return a result when commit messages do not match', () => {
    const commitMessage = 'my message1 (#1234)';
    const pullRequestEdge = getPullRequestEdgeMock({
      pullRequestNumber: 1234,
      timelinePullRequest: {
        title: 'a pr title',
        commits: ['my message2 (#1234)'],
      },
    });
    const existingPRs = getExistingTargetPullRequests(
      commitMessage,
      pullRequestEdge
    );
    expect(existingPRs).toEqual([]);
  });

  it('should return a result when commit message matches pull request title and number', () => {
    const commitMessage = 'my message (#1234)';
    const pullRequestEdge = getPullRequestEdgeMock({
      pullRequestNumber: 1234,
      timelinePullRequest: {
        title: 'my message (#1234)',
        commits: ['the actual message'],
      },
    });
    const existingPRs = getExistingTargetPullRequests(
      commitMessage,
      pullRequestEdge
    );
    expect(existingPRs).toEqual([{ branch: '7.x', state: 'MERGED' }]);
  });

  it('should not return a result when only pull request title (and not pull number) matches', () => {
    const commitMessage = 'my message (#1234)';
    const pullRequestEdge = getPullRequestEdgeMock({
      pullRequestNumber: 1234,
      timelinePullRequest: {
        title: 'my message (#1235)',
        commits: ['the actual message'],
      },
    });
    const existingPRs = getExistingTargetPullRequests(
      commitMessage,
      pullRequestEdge
    );
    expect(existingPRs).toEqual([]);
  });

  it('should return a result when first line of a multiline commit message matches', () => {
    const commitMessage = 'my message (#1234)';
    const pullRequestEdge = getPullRequestEdgeMock({
      pullRequestNumber: 1234,
      timelinePullRequest: {
        title: 'a pr title',
        commits: ['my message (#1234)\n\nsomething else'],
      },
    });
    const existingPRs = getExistingTargetPullRequests(
      commitMessage,
      pullRequestEdge
    );
    expect(existingPRs).toEqual([{ branch: '7.x', state: 'MERGED' }]);
  });
});

async function getExistingBackportsByRepoName(
  repoName1: string,
  repoName2: string
) {
  const commitsMock = getCommitsByAuthorMock(repoName1);

  mockGqlRequest({
    name: 'AuthorId',
    statusCode: 200,
    body: { data: authorIdMockData },
  });

  mockGqlRequest({
    name: 'CommitsByAuthor',
    statusCode: 200,
    body: { data: commitsMock },
  });

  return fetchCommitsByAuthor({
    ...defaultOptions,
    repoName: repoName2,
  });
}
