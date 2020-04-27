import axios from 'axios';
import { BackportOptions } from '../../../options/options';
import { CommitSelected, CommitChoice } from '../../../types/Commit';
import { SpyHelper } from '../../../types/SpyHelper';
import {
  fetchCommitsByAuthor,
  getExistingTargetPullRequests,
} from './fetchCommitsByAuthor';
import { commitsWithPullRequestsMock } from './mocks/commitsByAuthorMock';
import { getCommitsByAuthorMock } from './mocks/getCommitsByAuthorMock';
import { getPullRequestEdgeMock } from './mocks/getPullRequestEdgeMock';

const currentUserMock = { user: { id: 'myUserId' } } as const;

describe('fetchCommitsByAuthor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when commit has an associated pull request', () => {
    let axiosPostSpy: SpyHelper<typeof axios.post>;
    let res: CommitSelected[];
    beforeEach(async () => {
      axiosPostSpy = jest
        .spyOn(axios, 'post')
        .mockResolvedValueOnce({ data: { data: currentUserMock } })
        .mockResolvedValueOnce({ data: { data: commitsWithPullRequestsMock } });

      const options = getDefaultOptions();
      res = await fetchCommitsByAuthor(options);
    });

    it('Should return a list of commits with pullNumber and existing backports', () => {
      const expectedCommits: CommitChoice[] = [
        {
          sha: '2e63475c483f7844b0f2833bc57fdee32095bacb',
          formattedMessage: 'Add 👻 (2e63475c)',
          existingTargetPullRequests: [],
          selectedTargetBranches: [],
          sourceBranch: 'master',
        },
        {
          sha: 'f3b618b9421fdecdb36862f907afbdd6344b361d',
          formattedMessage: 'Add witch (#85)',
          pullNumber: 85,
          existingTargetPullRequests: [],
          selectedTargetBranches: [],
          sourceBranch: 'master',
        },
        {
          sha: '79cf18453ec32a4677009dcbab1c9c8c73fc14fe',
          formattedMessage: 'Add SF mention (#80)',
          pullNumber: 80,
          existingTargetPullRequests: [{ branch: '6.3', state: 'MERGED' }],
          selectedTargetBranches: [],
          sourceBranch: 'master',
        },
        {
          sha: '3827bbbaf39914eda4f02f6940189844375fd097',
          formattedMessage: 'Add backport config (3827bbba)',
          existingTargetPullRequests: [],
          selectedTargetBranches: [],
          sourceBranch: 'master',
        },
        {
          sha: '5ea0da550ac191029459289d67f99ad7d310812b',
          formattedMessage: 'Initial commit (5ea0da55)',
          existingTargetPullRequests: [],
          selectedTargetBranches: [],
          sourceBranch: 'master',
        },
      ];
      expect(res).toEqual(expectedCommits);
    });

    it('should call with correct args to fetch author id', () => {
      expect(axiosPostSpy.mock.calls[0]).toMatchSnapshot();
    });

    it('should call with correct args to fetch commits', () => {
      expect(axiosPostSpy.mock.calls[1]).toMatchSnapshot();
    });
  });

  describe('existingTargetPullRequests', () => {
    it('should return existingTargetPullRequests when repoNames match', async () => {
      const res = await getExistingBackportsByRepoName('kibana', 'kibana');
      const expectedCommits: CommitChoice[] = [
        {
          existingTargetPullRequests: [{ branch: '6.3', state: 'MERGED' }],
          formattedMessage: 'Add SF mention (#80)',
          pullNumber: 80,
          sha: '79cf18453ec32a4677009dcbab1c9c8c73fc14fe',
          sourceBranch: 'master',
          selectedTargetBranches: [],
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
          pullNumber: 80,
          sha: '79cf18453ec32a4677009dcbab1c9c8c73fc14fe',
          sourceBranch: 'master',
          selectedTargetBranches: [],
        },
      ];
      expect(res).toEqual(expectedCommits);
    });
  });

  describe('when a custom github api hostname is supplied', () => {
    it('should be used in gql requests', async () => {
      const axiosPostSpy = jest
        .spyOn(axios, 'post')
        .mockResolvedValueOnce({ data: { data: currentUserMock } })
        .mockResolvedValueOnce({ data: { data: commitsWithPullRequestsMock } });

      const options = getDefaultOptions({
        githubApiBaseUrlV4: 'https://api.github.my-company.com',
      });
      await fetchCommitsByAuthor(options);

      const baseUrls = axiosPostSpy.mock.calls.map((args) => args[0]);
      expect(baseUrls).toEqual([
        'https://api.github.my-company.com',
        'https://api.github.my-company.com',
      ]);
    });
  });
});

describe('getExistingTargetPullRequests', () => {
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

  jest
    .spyOn(axios, 'post')
    .mockResolvedValueOnce({ data: { data: currentUserMock } })
    .mockResolvedValueOnce({ data: { data: commitsMock } });

  const options = getDefaultOptions({
    repoName: repoName2,
  });
  return fetchCommitsByAuthor(options);
}

function getDefaultOptions(options: Partial<BackportOptions> = {}) {
  return {
    repoOwner: 'elastic',
    repoName: 'kibana',
    sourceBranch: 'master',
    accessToken: 'myAccessToken',
    username: 'sqren',
    author: 'sqren',
    maxNumber: 10,
    githubApiBaseUrlV3: 'https://api.github.com',
    githubApiBaseUrlV4: 'https://api.github.com/graphql',
    ...options,
  } as BackportOptions;
}
