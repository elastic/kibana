import { SourceCommitWithTargetPullRequest } from './parseSourceCommit';

export function getMockSourceCommit({
  sourceCommitMessage,
  sourcePullRequest,
  timelineItems = [],
}: {
  sourceCommitMessage: string;
  sourcePullRequest: {
    number: number;
    labels?: string[];
    sourceBranch?: string;
  } | null;
  timelineItems?: Array<{
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
    message: sourceCommitMessage,
    associatedPullRequests: {
      edges: !sourcePullRequest
        ? null
        : [
            {
              node: {
                url: `https://github.com/elastic/kibana/pull/${sourcePullRequest.number}`,
                labels: {
                  nodes: (sourcePullRequest.labels ?? []).map((name) => ({
                    name,
                  })),
                },
                baseRefName:
                  sourcePullRequest.sourceBranch ??
                  'source-branch-from-associated-pull-request',
                number: sourcePullRequest.number,
                timelineItems: {
                  edges: timelineItems.map((timelineItem) => {
                    return {
                      node: {
                        targetPullRequest: {
                          __typename: 'PullRequest',
                          url: `https://github.com/elastic/kibana/pull/${timelineItem.number}`,
                          title:
                            timelineItem.title ?? 'Default PR title (#123)',
                          number: timelineItem.number,
                          state: timelineItem.state,
                          baseRefName: timelineItem.targetBranch,
                          commits: {
                            edges: timelineItem.commitMessages.map(
                              (message) => ({
                                node: {
                                  targetCommit: {
                                    repository: {
                                      name: timelineItem.repoName ?? 'kibana',
                                      owner: {
                                        login:
                                          timelineItem.repoOwner ?? 'elastic',
                                      },
                                    },
                                    committedDate: '2021-12-23T00:00:00Z',
                                    oid: 'abc',
                                    message: message,
                                  },
                                },
                              })
                            ),
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
