import nock from 'nock';
import { ValidConfigOptions } from '../options/options';
import {
  parseSourceCommit,
  getExistingTargetPullRequests,
  SourceCommitWithTargetPullRequest,
} from './sourceCommit';

function getMockSourceCommit({
  sourcePullRequest,
  timelineItems,
}: {
  sourcePullRequest: {
    commitMessage: string;
    number: number;
    labels?: string[];
  };
  timelineItems: Array<{
    state: 'OPEN' | 'CLOSED' | 'MERGED';
    targetBranch: string;
    title?: string;
    number: number;
    commitMessages: string[];
    repoName?: string;
    repoOwner?: string;
  }>;
}) {
  const sourceCommit: SourceCommitWithTargetPullRequest = {
    repository: {
      name: 'kibana',
      owner: { login: 'elastic' },
    },
    committedDate: '2021-12-22T00:00:00Z',
    oid: '79cf18453ec32a4677009dcbab1c9c8c73fc14fe',
    message: sourcePullRequest.commitMessage,
    associatedPullRequests: {
      edges: [
        {
          node: {
            labels: {
              nodes: (sourcePullRequest.labels ?? []).map((name) => ({ name })),
            },
            baseRefName: 'source-branch-from-associated-pull-request',
            number: sourcePullRequest.number,
            timelineItems: {
              edges: timelineItems.map((timelineItem) => {
                return {
                  node: {
                    targetPullRequest: {
                      __typename: 'PullRequest',
                      title: timelineItem.title ?? 'Default PR title (#123)',
                      number: timelineItem.number,
                      state: timelineItem.state,
                      baseRefName: timelineItem.targetBranch,
                      commits: {
                        edges: timelineItem.commitMessages.map((message) => ({
                          node: {
                            targetCommit: {
                              repository: {
                                name: timelineItem.repoName ?? 'kibana',
                                owner: {
                                  login: timelineItem.repoOwner ?? 'elastic',
                                },
                              },
                              committedDate: '2021-12-23T00:00:00Z',
                              oid: 'abc',
                              message: message,
                            },
                          },
                        })),
                      },
                    },
                  },
                };
              }),
            },
          },
        },
      ],
    },
  };
  return sourceCommit;
}

describe('getExistingTargetPullRequests', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('should return a result when commit messages match', () => {
    const mockSourceCommit = getMockSourceCommit({
      sourcePullRequest: {
        commitMessage: 'identical messages (#1234)',
        number: 1234,
      },
      timelineItems: [
        {
          state: 'MERGED',
          targetBranch: '6.x',
          commitMessages: ['identical messages (#1234)'],
          number: 5678,
        },
      ],
    });
    const existingPRs = getExistingTargetPullRequests(mockSourceCommit);
    expect(existingPRs).toEqual([
      { branch: '6.x', state: 'MERGED', number: 5678 },
    ]);
  });

  it('should not PR when repoName does not match', () => {
    const mockSourceCommit = getMockSourceCommit({
      sourcePullRequest: {
        commitMessage: 'identical messages (#1234)',
        number: 1234,
      },
      timelineItems: [
        {
          state: 'MERGED',
          targetBranch: '6.x',
          commitMessages: ['identical messages (#1234)'],
          number: 5678,
          repoName: 'foo',
        },
      ],
    });
    const existingPRs = getExistingTargetPullRequests(mockSourceCommit);
    expect(existingPRs).toEqual([]);
  });

  it('should not PR when repoOwner does not match', () => {
    const mockSourceCommit = getMockSourceCommit({
      sourcePullRequest: {
        commitMessage: 'identical messages (#1234)',
        number: 1234,
      },
      timelineItems: [
        {
          state: 'MERGED',
          targetBranch: '6.x',
          commitMessages: ['identical messages (#1234)'],
          number: 5678,
          repoOwner: 'foo',
        },
      ],
    });
    const existingPRs = getExistingTargetPullRequests(mockSourceCommit);
    expect(existingPRs).toEqual([]);
  });

  it('should not return a result when commit messages do not match', () => {
    const mockSourceCommit = getMockSourceCommit({
      sourcePullRequest: {
        commitMessage: 'message one (#1234)',
        number: 1234,
      },
      timelineItems: [
        {
          state: 'MERGED',
          targetBranch: '6.x',
          commitMessages: ['message two (#1234)'],
          number: 5678,
        },
      ],
    });
    const existingPRs = getExistingTargetPullRequests(mockSourceCommit);
    expect(existingPRs).toEqual([]);
  });

  it('should return a result if commits messages are different but title includes message and number', () => {
    const mockSourceCommit = getMockSourceCommit({
      sourcePullRequest: {
        commitMessage: 'message one (#1234)',
        number: 1234,
      },
      timelineItems: [
        {
          state: 'MERGED',
          targetBranch: '6.x',
          commitMessages: ['message two (#1234)'],
          title: 'message one (#1234)',
          number: 5678,
        },
      ],
    });
    const existingPRs = getExistingTargetPullRequests(mockSourceCommit);
    expect(existingPRs).toEqual([
      { branch: '6.x', state: 'MERGED', number: 5678 },
    ]);
  });

  it('should not return a result when only pull request title (but not pull number) matches', () => {
    const mockSourceCommit = getMockSourceCommit({
      sourcePullRequest: {
        commitMessage: 'message one (#1234)',
        number: 1234,
      },
      timelineItems: [
        {
          state: 'MERGED',
          targetBranch: '6.x',
          commitMessages: ['message two (#1234)'],
          title: 'message one (#9999)',
          number: 5678,
        },
      ],
    });
    const existingPRs = getExistingTargetPullRequests(mockSourceCommit);
    expect(existingPRs).toEqual([]);
  });

  it('should return a result when first line of a multiline commit message matches', () => {
    const mockSourceCommit = getMockSourceCommit({
      sourcePullRequest: {
        commitMessage: 'message one (#1234)',
        number: 1234,
      },
      timelineItems: [
        {
          state: 'MERGED',
          targetBranch: '6.x',
          commitMessages: ['message one (#1234)\n\nsomething else'],
          number: 5678,
        },
      ],
    });
    const existingPRs = getExistingTargetPullRequests(mockSourceCommit);
    expect(existingPRs).toEqual([
      { branch: '6.x', state: 'MERGED', number: 5678 },
    ]);
  });
});

describe('parseSourceCommit', () => {
  const mockSourceCommit = getMockSourceCommit({
    sourcePullRequest: {
      commitMessage: 'My commit message (#1234)',
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

  it('parses the sourceCommit', () => {
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
      existingTargetPullRequests: [
        { branch: '6.x', number: 5678, state: 'MERGED' },
        { branch: '6.2', number: 9876, state: 'OPEN' },
      ],
      formattedMessage: 'My commit message (#1234)',
      originalMessage: 'My commit message (#1234)',
      pullNumber: 1234,
      sha: '79cf18453ec32a4677009dcbab1c9c8c73fc14fe',
      sourceBranch: 'source-branch-from-associated-pull-request',
      targetBranchesFromLabels: {
        expected: ['6.x', '6.2', '6.1'],
        missing: ['6.1'],
        unmerged: ['6.2'],
        merged: ['6.x'],
      },
    });
  });
});
