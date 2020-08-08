import { BackportOptions } from '../../../options/options';
import { getDevAccessToken } from '../../../test/private/getDevAccessToken';
import { CommitChoice } from '../../../types/Commit';
import { fetchCommitsByAuthor } from './fetchCommitsByAuthor';

describe('fetchCommitsByAuthor', () => {
  let devAccessToken: string;

  beforeAll(async () => {
    devAccessToken = await getDevAccessToken();
  });

  describe('when commit has an associated pull request', () => {
    it('Should return a list of commits with pullNumber and existing backports', async () => {
      const res = await fetchCommitsByAuthor({
        repoOwner: 'sqren',
        repoName: 'backport-demo',
        sourceBranch: 'master',
        accessToken: devAccessToken,
        username: 'sqren',
        author: 'sqren',
        maxNumber: 10,
        githubApiBaseUrlV4: 'https://api.github.com/graphql',
      } as BackportOptions);

      const expectedCommits: CommitChoice[] = [
        {
          existingTargetPullRequests: [],
          formattedMessage: 'Add branch label mapping (#225)',
          pullNumber: 225,
          sha: 'f287d1ea35ae9ec6b45394c5c40b76c1f2cfa79d',
          sourceBranch: 'master',
          targetBranchesFromLabels: [],
        },
        {
          existingTargetPullRequests: [],
          formattedMessage:
            'Create "conflicting-file.txt" in master (f8bb8b70)',
          pullNumber: undefined,
          sha: 'f8bb8b701e54821153bf958a8b4a9b13f38cde14',
          sourceBranch: 'master',
          targetBranchesFromLabels: [],
        },
        {
          existingTargetPullRequests: [],
          formattedMessage: 'Update romeo-and-juliet.txt (91eee967)',
          pullNumber: undefined,
          sha: '91eee9673ff069c54f7c542e51542a640975aada',
          sourceBranch: 'master',
          targetBranchesFromLabels: [],
        },
        {
          existingTargetPullRequests: [],
          formattedMessage: 'Add 👻 (2e63475c)',
          pullNumber: undefined,
          sha: '2e63475c483f7844b0f2833bc57fdee32095bacb',
          sourceBranch: 'master',
          targetBranchesFromLabels: [],
        },
        {
          existingTargetPullRequests: [],
          formattedMessage: 'Add witch (#85)',
          pullNumber: 85,
          sha: 'f3b618b9421fdecdb36862f907afbdd6344b361d',
          sourceBranch: 'master',
          targetBranchesFromLabels: [],
        },
        {
          existingTargetPullRequests: [{ branch: '6.3', state: 'MERGED' }],
          formattedMessage: 'Add SF mention (#80)',
          pullNumber: 80,
          sha: '79cf18453ec32a4677009dcbab1c9c8c73fc14fe',
          sourceBranch: 'master',
          targetBranchesFromLabels: [],
        },
        {
          existingTargetPullRequests: [],
          formattedMessage: 'Add backport config (3827bbba)',
          pullNumber: undefined,
          sha: '3827bbbaf39914eda4f02f6940189844375fd097',
          sourceBranch: 'master',
          targetBranchesFromLabels: [],
        },
        {
          existingTargetPullRequests: [],
          formattedMessage: 'Initial commit (5ea0da55)',
          pullNumber: undefined,
          sha: '5ea0da550ac191029459289d67f99ad7d310812b',
          sourceBranch: 'master',
          targetBranchesFromLabels: [],
        },
      ];
      expect(res).toEqual(expectedCommits);
    });
  });
});
