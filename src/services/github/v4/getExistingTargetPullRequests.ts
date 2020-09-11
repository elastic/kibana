import { filterNil } from '../../../utils/filterEmpty';
import { getFirstCommitMessageLine } from '../commitFormatters';

export const pullRequestFragmentName = 'SourcePRAndTargetPRs';
export const pullRequestFragment = /* GraphQL */ `
  fragment ${pullRequestFragmentName} on PullRequest {
    # Source PR
    number
    repository {
      name
      owner {
        login
      }
    }
    mergeCommit {
      oid
      message
    }
    labels(first: 50) {
      nodes {
        name
      }
    }
    baseRefName
    timelineItems(last: 20, itemTypes: CROSS_REFERENCED_EVENT) {
      edges {
        node {
          ... on CrossReferencedEvent {
            source {
              __typename

              # Target PRs
              ... on PullRequest {
                title
                state
                baseRefName
                commits(first: 20) {
                  edges {
                    node {
                      commit {
                        message
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

export interface PullRequestNode {
  baseRefName: string;
  number: number;
  mergeCommit: {
    oid: string;
    message: string;
  } | null;
  labels: {
    nodes: {
      name: string;
    }[];
  };
  repository: {
    owner: {
      login: string;
    };
    name: string;
  };
  timelineItems: {
    edges: (TimelineItemEdge | null)[];
  };
}

interface PullRequestTimelineItem {
  node: {
    source: {
      __typename: 'PullRequest';
      title: string;
      state: 'OPEN' | 'CLOSED' | 'MERGED';
      baseRefName: string;
      commits: {
        edges: CommitEdge[];
      };
    };
  };
}

interface IssueTimelineItem {
  node: {
    source: {
      __typename: 'Issue';
    };
  };
}

type TimelineItemEdge = PullRequestTimelineItem | IssueTimelineItem;

interface CommitEdge {
  node: {
    commit: {
      message: string;
    };
  };
}

export function getPullRequestLabels(pullRequestNode?: PullRequestNode) {
  return pullRequestNode?.labels.nodes.map((label) => label.name);
}

export type ExistingTargetPullRequests = ReturnType<
  typeof getExistingTargetPullRequests
>;
export function getExistingTargetPullRequests(
  commitMessage: string,
  sourcePullRequest?: PullRequestNode
) {
  if (!sourcePullRequest) {
    return [];
  }

  const firstMessageLine = getFirstCommitMessageLine(commitMessage);
  return sourcePullRequest.timelineItems.edges
    .filter(filterNil)
    .filter(filterPullRequests)
    .filter((item) => {
      const { source } = item.node;

      if (source.state !== 'MERGED' && source.state !== 'OPEN') {
        return false;
      }

      const commitMatch = source.commits.edges.some((commit) => {
        return (
          getFirstCommitMessageLine(commit.node.commit.message) ===
          firstMessageLine
        );
      });

      const prTitleMatch = source.title.includes(firstMessageLine);
      const prNumberMatch = source.title.includes(
        sourcePullRequest.number.toString()
      );

      return commitMatch || (prTitleMatch && prNumberMatch);
    })
    .map((item) => {
      const { source } = item.node;
      return {
        branch: source.baseRefName,
        state: source.state,
      };
    });
}

function filterPullRequests(
  item: TimelineItemEdge
): item is PullRequestTimelineItem {
  const { source } = item.node;
  // filter out non-prs
  if (source.__typename !== 'PullRequest') {
    return false;
  }

  return true;
}
