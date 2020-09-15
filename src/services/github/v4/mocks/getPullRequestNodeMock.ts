import { PullRequestNode } from '../getExistingTargetPullRequests';

export function getPullRequestNodeMock({
  sourcePullRequest,
  targetPullRequest,
}: {
  sourcePullRequest: {
    commitMessage: string;
    number: number;
  };
  targetPullRequest: {
    title: string;
    commitMessages: string[];
    number: number;
  };
}): PullRequestNode {
  return {
    labels: {
      nodes: [{ name: 'my-label-a' }],
    },
    mergeCommit: {
      oid: 'f3b618b9421fdecdb36862f907afbdd6344b361d',
      message: sourcePullRequest.commitMessage,
    },
    repository: {
      name: 'kibana',
      owner: {
        login: 'elastic',
      },
    },
    baseRefName: 'master',
    number: sourcePullRequest.number,
    timelineItems: {
      edges: [
        {
          node: {
            source: {
              __typename: 'PullRequest',
              number: targetPullRequest.number,
              title: targetPullRequest.title,
              state: 'MERGED' as const,
              commits: {
                edges: targetPullRequest.commitMessages.map((message) => ({
                  node: { commit: { message } },
                })),
              },
              baseRefName: '7.x',
            },
          },
        },
      ],
    },
  };
}
