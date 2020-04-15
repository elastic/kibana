import { PullRequestEdge } from '../fetchCommitsByAuthor';

export function getPullRequestEdgeMock({
  pullRequestNumber,
  timelinePullRequest,
}: {
  pullRequestNumber: number;
  timelinePullRequest: {
    title: string;
    commits: string[];
  };
}): PullRequestEdge {
  return {
    node: {
      labels: {
        nodes: [{ name: 'my-label-a' }],
      },
      mergeCommit: {
        oid: 'f3b618b9421fdecdb36862f907afbdd6344b361d',
      },
      repository: {
        name: 'kibana',
        owner: {
          login: 'elastic',
        },
      },
      number: pullRequestNumber,
      timelineItems: {
        edges: [
          {
            node: {
              source: {
                __typename: 'PullRequest',
                title: timelinePullRequest.title,
                state: 'MERGED' as const,
                commits: {
                  edges: timelinePullRequest.commits.map((message) => ({
                    node: { commit: { message } },
                  })),
                },
                baseRefName: '7.x',
              },
            },
          },
        ],
      },
    },
  };
}
