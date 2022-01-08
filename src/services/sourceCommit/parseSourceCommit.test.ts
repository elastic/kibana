import { ValidConfigOptions } from '../../options/options';
import { getMockSourceCommit } from './getMockSourceCommit';
import { parseSourceCommit } from './parseSourceCommit';

describe('parseSourceCommit', () => {
  describe('pullNumber', () => {
    it('receives `pullNumber` from the associated pull request', () => {
      const mockSourceCommit = getMockSourceCommit({
        sourceCommit: { message: 'My commit message (#1234)' },
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
        sourceCommit: { message: 'My commit message (#66)' },
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
        sourceCommit: { message: 'My commit message (#66)' },
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
        sourceCommit: { message: 'My commit message (#66)' },
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

  describe('expectedTargetPullRequests', () => {
    it('uses options.branchLabelMapping when historicalBranchLabelMappings is empty', () => {
      const mockSourceCommit = getMockSourceCommit({
        sourceCommit: {
          message: 'My commit message (#66)',
          commitedDate: '2021-03-03T00:00:00Z',
        },
        sourcePullRequest: {
          sourceBranch: 'main',
          number: 55,
          labels: ['v6.4.0', 'v6.3.0', 'v6.2.0', 'v6.1.0'],
        },
        timelineItems: [
          {
            state: 'MERGED',
            targetBranch: '6.3',
            commitMessages: ['My commit message (#66)'],
            number: 5678,
          },
          {
            state: 'OPEN',
            targetBranch: '6.2',
            commitMessages: ['My commit message (#66)'],
            number: 9876,
          },
        ],
      });

      const commit = parseSourceCommit({
        sourceCommit: mockSourceCommit,
        options: {
          branchLabelMapping: {
            '^v6.4.0$': 'main',
            '^v(\\d+).(\\d+).\\d+$': '$1.$2',
          },
          historicalBranchLabelMappings: [],
        } as unknown as ValidConfigOptions,
      });

      expect(commit.expectedTargetPullRequests).toEqual([
        {
          branch: '6.3',
          number: 5678,
          state: 'MERGED',
          url: 'https://github.com/elastic/kibana/pull/5678',
          mergeCommit: {
            message: 'My commit message (#66)',
            sha: 'target-merge-commit-sha',
          },
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
      ]);
    });

    it('uses the historical branchLabelMapping from 2021-02-02', () => {
      const mockSourceCommit = getMockSourceCommit({
        sourceCommit: {
          message: 'My commit message (#66)',
          commitedDate: '2021-03-03T00:00:00Z',
        },
        sourcePullRequest: {
          sourceBranch: 'main',
          number: 55,
          labels: ['v6.3.0', 'v6.2.0', 'v6.1.0'],
        },
        timelineItems: [
          {
            state: 'OPEN',
            targetBranch: '6.2',
            commitMessages: ['My commit message (#66)'],
            number: 9876,
          },
        ],
      });

      const commit = parseSourceCommit({
        sourceCommit: mockSourceCommit,
        options: {
          branchLabelMapping: {
            '^v6.4.0$': 'main',
            '^v(\\d+).(\\d+).\\d+$': '$1.$2',
          },
          historicalBranchLabelMappings: [
            {
              branchLabelMapping: {
                '^v6.4.0$': 'main',
                '^v(\\d+).(\\d+).\\d+$': '$1.$2',
              },
              committedDate: '2021-04-04T00:00:00Z',
            },
            {
              branchLabelMapping: {
                '^v6.3.0$': 'main',
                '^v(\\d+).(\\d+).\\d+$': '$1.$2',
              },
              committedDate: '2021-02-02T00:00:00Z',
            },
          ],
        } as unknown as ValidConfigOptions,
      });

      expect(commit.expectedTargetPullRequests).toEqual([
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
      ]);
    });
  });

  it('returns the correct source commit', () => {
    const mockSourceCommit = getMockSourceCommit({
      sourceCommit: { message: 'My commit message (#1234)', sha: 'my-sha' },
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
          mergeCommit: {
            message: 'My commit message (#1234)',
            sha: 'target-merge-commit-sha',
          },
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
      sha: 'my-sha',
      sourceBranch: 'source-branch-from-associated-pull-request',
    });
  });
});
