import { ValidConfigOptions } from '../../../../options/options';
import { getDevAccessToken } from '../../../../test/private/getDevAccessToken';
import { fetchCommitByPullNumber } from './fetchCommitByPullNumber';
import { fetchCommitBySha } from './fetchCommitBySha';
import { fetchCommitsByAuthor } from './fetchCommitsByAuthor';
import { fetchPullRequestBySearchQuery } from './fetchPullRequestBySearchQuery';

describe('allFetchers', () => {
  let devAccessToken: string;

  beforeEach(async () => {
    devAccessToken = await getDevAccessToken();
  });

  it('all fetchers return the same commit', async () => {
    const commitsByAuthor = await fetchCommitsByAuthor({
      accessToken: devAccessToken,
      author: 'sqren',
      historicalBranchLabelMappings: [],
      maxNumber: 1,
      repoName: 'kibana',
      repoOwner: 'elastic',
      sourceBranch: 'main',
      dateSince: '2021-01-10T00:00:00Z',
      dateUntil: '2022-01-01T00:00:00Z',
      commitPaths: [] as Array<string>,
    });

    const commitByAuthor = commitsByAuthor[0];

    if (!commitByAuthor.pullNumber) {
      throw new Error('Missing pullnumber!');
    }

    const commitByPullNumber = await fetchCommitByPullNumber({
      repoOwner: 'elastic',
      repoName: 'kibana',
      accessToken: devAccessToken,
      pullNumber: commitByAuthor.pullNumber,
      sourceBranch: 'master',
      historicalBranchLabelMappings: [],
    });

    const commitBySha = await fetchCommitBySha({
      repoOwner: 'elastic',
      repoName: 'kibana',
      accessToken: devAccessToken,
      sha: commitByAuthor.sha,
      sourceBranch: 'main',
      historicalBranchLabelMappings: [],
    });

    const commitsBySearchQuery = await fetchPullRequestBySearchQuery({
      repoOwner: 'elastic',
      repoName: 'kibana',
      accessToken: devAccessToken,
      maxNumber: 1,
      prFilter: `[APM] Add note about synthtrace to APM docs`,
      sourceBranch: 'main',
    } as ValidConfigOptions);

    expect(commitByAuthor).toEqual(commitByPullNumber);
    expect(commitByAuthor).toEqual(commitBySha);
    expect(commitByAuthor).toEqual(commitsBySearchQuery[0]);
    expect(commitByAuthor).toEqual({
      committedDate: '2021-12-20T14:20:16Z',
      expectedTargetPullRequests: [
        {
          branch: '8.0',
          mergeCommit: {
            message:
              '[APM] Add note about synthtrace to APM docs (#121633) (#121643)\n\nCo-authored-by: Søren Louv-Jansen <soren.louv@elastic.co>',
            sha: '842adfdeb5541b059231857522f9009771a46107',
          },
          number: 121643,
          state: 'MERGED',
          url: 'https://github.com/elastic/kibana/pull/121643',
        },
      ],
      originalMessage: '[APM] Add note about synthtrace to APM docs (#121633)',
      pullNumber: 121633,
      pullUrl: 'https://github.com/elastic/kibana/pull/121633',
      sha: 'd421ddcf6157150596581c7885afa3690cec6339',
      sourceBranch: 'main',
    });
  });
});
