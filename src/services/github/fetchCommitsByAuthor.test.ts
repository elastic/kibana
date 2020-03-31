import { CommitSelected } from './Commit';
import {
  fetchCommitsByAuthor,
  getExistingBackportPRs,
} from './fetchCommitsByAuthor';
import { commitsWithPullRequestsMock } from './mocks/commitsByAuthorMock';
import { getExistingBackportPRsMock } from './mocks/getExistingBackportPRsMock';
import { getDefaultOptions } from '../../test/getDefaultOptions';
import axios from 'axios';
import { getPullRequestEdgeMock } from './mocks/getPullRequestEdgeMock';

const currentUserMock = { user: { id: 'myUserId' } } as const;

describe('fetchCommitsByAuthor', () => {
  describe('when commit has an associated pull request', () => {
    let requestSpy: jasmine.Spy;
    let res: CommitSelected[];
    beforeEach(async () => {
      requestSpy = spyOn(axios, 'post').and.returnValues(
        { data: { data: currentUserMock } },
        { data: { data: commitsWithPullRequestsMock } }
      );

      const options = getDefaultOptions();
      res = await fetchCommitsByAuthor(options);
    });

    it('Should return a list of commits with pullNumber and existing backports', () => {
      expect(res).toEqual([
        {
          sha: '2e63475c483f7844b0f2833bc57fdee32095bacb',
          formattedMessage: 'Add 👻 (2e63475c)',
          existingBackports: [],
        },
        {
          sha: 'f3b618b9421fdecdb36862f907afbdd6344b361d',
          formattedMessage: 'Add witch (#85)',
          pullNumber: 85,
          existingBackports: [],
        },
        {
          sha: '79cf18453ec32a4677009dcbab1c9c8c73fc14fe',
          formattedMessage: 'Add SF mention (#80)',
          pullNumber: 80,
          existingBackports: [{ branch: '6.3', state: 'MERGED' }],
        },
        {
          sha: '3827bbbaf39914eda4f02f6940189844375fd097',
          formattedMessage: 'Add backport config (3827bbba)',
          existingBackports: [],
        },
        {
          sha: '5ea0da550ac191029459289d67f99ad7d310812b',
          formattedMessage: 'Initial commit (5ea0da55)',
          existingBackports: [],
        },
      ]);
    });

    it('should call with correct args to fetch author id', () => {
      expect(requestSpy.calls.argsFor(0)).toMatchSnapshot();
    });

    it('should call with correct args to fetch commits', () => {
      expect(requestSpy.calls.argsFor(1)).toMatchSnapshot();
    });
  });

  describe('existingBackports', () => {
    it('should return existingBackports when repoNames match', async () => {
      const res = await getExistingBackportsByRepoName('kibana', 'kibana');
      expect(res).toEqual([
        {
          existingBackports: [{ branch: '6.3', state: 'MERGED' }],
          formattedMessage: 'Add SF mention (#80)',
          pullNumber: 80,
          sha: '79cf18453ec32a4677009dcbab1c9c8c73fc14fe',
        },
      ]);
    });

    it('should not return existingBackports when repoNames does not match', async () => {
      const res = await getExistingBackportsByRepoName('kibana', 'kibana2');
      expect(res).toEqual([
        {
          existingBackports: [],
          formattedMessage: 'Add SF mention (#80)',
          pullNumber: 80,
          sha: '79cf18453ec32a4677009dcbab1c9c8c73fc14fe',
        },
      ]);
    });
  });

  describe('when a custom github api hostname is supplied', () => {
    it('should be used in gql requests', async () => {
      const requestSpy = spyOn(axios, 'post').and.returnValues(
        { data: { data: currentUserMock } },
        { data: { data: commitsWithPullRequestsMock } }
      );

      const options = getDefaultOptions({
        githubApiBaseUrlV4: 'https://api.github.my-company.com',
      });
      await fetchCommitsByAuthor(options);

      expect(requestSpy.calls.argsFor(0)[0]).toBe(
        'https://api.github.my-company.com'
      );
      expect(requestSpy.calls.argsFor(1)[0]).toBe(
        'https://api.github.my-company.com'
      );
    });
  });
});

describe('getExistingBackportPRs', () => {
  it('should return a result when commit messages match', () => {
    const commitMessage = 'my message (#1234)';
    const pullRequestEdge = getPullRequestEdgeMock({
      pullRequestNumber: 1234,
      timelinePullRequest: {
        title: 'a pr title',
        commits: ['my message (#1234)'],
      },
    });
    const existingPRs = getExistingBackportPRs(commitMessage, pullRequestEdge);
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
    const existingPRs = getExistingBackportPRs(commitMessage, pullRequestEdge);
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
    const existingPRs = getExistingBackportPRs(commitMessage, pullRequestEdge);
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
    const existingPRs = getExistingBackportPRs(commitMessage, pullRequestEdge);
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
    const existingPRs = getExistingBackportPRs(commitMessage, pullRequestEdge);
    expect(existingPRs).toEqual([{ branch: '7.x', state: 'MERGED' }]);
  });
});

async function getExistingBackportsByRepoName(
  repoName1: string,
  repoName2: string
) {
  const existingPrsMock = getExistingBackportPRsMock(repoName1);

  spyOn(axios, 'post').and.returnValues(
    { data: { data: currentUserMock } },
    { data: { data: existingPrsMock } }
  );

  const options = getDefaultOptions({
    repoName: repoName2,
  });
  return fetchCommitsByAuthor(options);
}
