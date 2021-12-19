import { ValidConfigOptions } from '../../options/options';
import { getMockSourceCommit } from './getMockSourceCommit';
import { parseSourceCommit } from './parseSourceCommit';

describe('parseSourceCommit', () => {
  describe('pullNumber', () => {
    it('receives `pullNumber` from the associated pull request', () => {
      const mockSourceCommit = getMockSourceCommit({
        sourceCommitMessage: 'My commit message (#1234)',
        sourcePullRequest: { number: 55 },
      });

      const commit = parseSourceCommit({
        sourceCommit: mockSourceCommit,
        options: {} as unknown as ValidConfigOptions,
      });

      expect(commit.pullNumber).toBe(55);
    });

    it('extracts `pullNumber` from commit message if it doesnt have any associated PRs', () => {
      const mockSourceCommit = getMockSourceCommit({
        sourceCommitMessage: 'My commit message (#66)',
        sourcePullRequest: null,
      });

      const commit = parseSourceCommit({
        sourceCommit: mockSourceCommit,
        options: {} as unknown as ValidConfigOptions,
      });

      expect(commit.pullNumber).toBe(66);
    });
  });

  describe('sourceBranch', () => {
    it('sets sourceBranch based on `baseRefName` from associated PR', () => {
      const mockSourceCommit = getMockSourceCommit({
        sourceCommitMessage: 'My commit message (#66)',
        sourcePullRequest: { number: 55, sourceBranch: 'a sourcebranch' },
      });

      const commit = parseSourceCommit({
        sourceCommit: mockSourceCommit,
        options: {} as unknown as ValidConfigOptions,
      });

      expect(commit.sourceBranch).toBe('a sourcebranch');
    });

    it('sets uses options.sourceBranch as fallback', () => {
      const mockSourceCommit = getMockSourceCommit({
        sourceCommitMessage: 'My commit message (#66)',
        sourcePullRequest: null,
      });

      const commit = parseSourceCommit({
        sourceCommit: mockSourceCommit,
        options: {
          sourceBranch: 'sourcebranch-from-options',
        } as unknown as ValidConfigOptions,
      });

      expect(commit.sourceBranch).toBe('sourcebranch-from-options');
    });
  });

  it('returns the correct source commit', () => {
    const mockSourceCommit = getMockSourceCommit({
      sourceCommitMessage: 'My commit message (#1234)',
      sourcePullRequest: {
        number: 1234,
        labels: ['v6.3.0', 'v6.2.0', 'v6.1.0'],
      },
      timelineItems: [
        {
          state: 'MERGED',
          targetBranch: '6.x',
          commitMessages: ['My commit message (#1234)'],
          number: 5678,
        },
        {
          state: 'OPEN',
          targetBranch: '6.2',
          commitMessages: ['My commit message (#1234)'],
          number: 9876,
        },
      ],
    });

    const commit = parseSourceCommit({
      sourceCommit: mockSourceCommit,
      options: {
        branchLabelMapping: {
          '^v6.3.0$': '6.x',
          '^v(\\d+).(\\d+).\\d+$': '$1.$2',
        },
      } as unknown as ValidConfigOptions,
    });

    expect(commit).toEqual({
      committedDate: '2021-12-22T00:00:00Z',
      expectedTargetPullRequests: [
        {
          branch: '6.x',
          number: 5678,
          state: 'MERGED',
          url: 'https://github.com/elastic/kibana/pull/5678',
        },
        {
          branch: '6.2',
          number: 9876,
          state: 'OPEN',
          url: 'https://github.com/elastic/kibana/pull/9876',
        },
        {
          branch: '6.1',
          state: 'MISSING',
        },
      ],
      originalMessage: 'My commit message (#1234)',
      pullNumber: 1234,
      pullUrl: 'https://github.com/elastic/kibana/pull/1234',
      sha: '79cf18453ec32a4677009dcbab1c9c8c73fc14fe',
      sourceBranch: 'source-branch-from-associated-pull-request',
    });
  });
});
