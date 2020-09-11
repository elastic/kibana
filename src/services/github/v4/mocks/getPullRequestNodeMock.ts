import { PullRequestNode } from '../getExistingTargetPullRequests';

export function getPullRequestNodeMock({
  pullRequestNumber,
  timelinePullRequest,
}: {
  pullRequestNumber: number;
  timelinePullRequest: {
    title: string;
    commits: string[];
  };
}): PullRequestNode {
  return {
    labels: {
      nodes: [{ name: 'my-label-a' }],
    },
    mergeCommit: {
      oid: 'f3b618b9421fdecdb36862f907afbdd6344b361d',
      message: 'my commit message...1',
    },
    repository: {
      name: 'kibana',
      owner: {
        login: 'elastic',
      },
    },
    baseRefName: 'master',
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
  };
}
