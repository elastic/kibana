import { filterNil } from '../../../utils/filterEmpty';
import { getFirstCommitMessageLine } from '../commitFormatters';

export const pullRequestFragmentName = 'ExistingTargetPullRequests';
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
                number
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
    edges: TimelineItemEdge[];
  };
}

interface TimeLinePullRequestItem {
  node: {
    source: {
      __typename: 'PullRequest';
      title: string;
      state: 'OPEN' | 'CLOSED' | 'MERGED';
      baseRefName: string;
      number: number;
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

type TimelineItemEdge = TimeLinePullRequestItem | IssueTimelineItem;

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
  sourcePullRequest?: PullRequestNode
) {
  if (!sourcePullRequest || !sourcePullRequest.mergeCommit) {
    return [];
  }

  const sourcePRMergeCommitMessage = getFirstCommitMessageLine(
    sourcePullRequest.mergeCommit.message
  );

  return sourcePullRequest.timelineItems.edges
    .filter(filterNil)
    .filter(filterPullRequests)
    .filter((item) => {
      const { source } = item.node;

      if (source.state !== 'MERGED' && source.state !== 'OPEN') {
        return false;
      }

      // at least one of the commits in the target pull request should match the merge commit from the source pull request
      const commitMatch = source.commits.edges.some((commit) => {
        const targetPRCommitMessage = getFirstCommitMessageLine(
          commit.node.commit.message
        );
        return targetPRCommitMessage === sourcePRMergeCommitMessage;
      });

      const prTitleMatch = source.title.includes(sourcePRMergeCommitMessage);
      const prNumberMatch = source.title.includes(
        sourcePullRequest.number.toString()
      );

      return commitMatch || (prTitleMatch && prNumberMatch);
    })
    .map((item) => {
      const { source } = item.node;
      return {
        number: source.number,
        branch: source.baseRefName,
        state: source.state,
      };
    });
}

function filterPullRequests(
  item: TimelineItemEdge
): item is TimeLinePullRequestItem {
  const { source } = item.node;
  // filter out non-prs
  if (source.__typename !== 'PullRequest') {
    return false;
  }

  return true;
}
