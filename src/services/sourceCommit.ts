import { ValidConfigOptions } from '../options/options';
import {
  getFirstCommitMessageLine,
  getFormattedCommitMessage,
  getPullNumberFromMessage,
} from '../services/github/commitFormatters';
import { getTargetBranchesFromLabels } from '../services/github/v4/getTargetBranchesFromLabels';
import { filterNil } from '../utils/filterEmpty';

export interface Commit {
  committedDate: string;
  sourceBranch: string;
  targetBranchesFromLabels: {
    expected: string[];
    missing: string[];
    unmerged: string[];
    merged: string[];
  };
  sha: string;
  formattedMessage: string;
  originalMessage: string;
  pullNumber?: number;
  pullUrl?: string;
  existingTargetPullRequests: ExistingTargetPullRequests;
}

export interface PullRequestNode {
  baseRefName: string;
  url: string;
  number: number;
  labels: {
    nodes: {
      name: string;
    }[];
  };
  timelineItems: {
    edges: Array<TimelineEdge>;
  };
}

type TimelineEdge = TimelinePullRequestEdge | TimelineIssueEdge;

interface TimelinePullRequestEdge {
  node: {
    targetPullRequest: {
      __typename: 'PullRequest';
      url: string;
      title: string;
      state: 'OPEN' | 'CLOSED' | 'MERGED';
      baseRefName: string;
      number: number;
      commits: {
        edges: Array<{
          node: { targetCommit: InnerCommitNode };
        }>;
      };
    };
  };
}

interface TimelineIssueEdge {
  node: { targetPullRequest: { __typename: 'Issue' } };
}

type InnerCommitNode = {
  repository: {
    name: string;
    owner: { login: string };
  };
  oid: string;
  message: string;
  committedDate: string;
};

export type SourceCommitWithTargetPullRequest = InnerCommitNode & {
  associatedPullRequests: {
    edges: { node: PullRequestNode }[] | null;
  };
};

function getPullRequestLabels(pullRequestNode?: PullRequestNode) {
  return pullRequestNode?.labels.nodes.map((label) => label.name);
}

export function parseSourceCommit({
  sourceCommit,
  options,
}: {
  sourceCommit: SourceCommitWithTargetPullRequest;
  options: ValidConfigOptions;
}): Commit {
  const existingTargetPullRequests =
    getExistingTargetPullRequests(sourceCommit);
  const pullRequestNode = sourceCommit.associatedPullRequests.edges?.[0]?.node;
  const commitMessage = sourceCommit.message;
  const sha = sourceCommit.oid;
  const pullNumber =
    pullRequestNode?.number ?? getPullNumberFromMessage(commitMessage);

  const sourceBranch = pullRequestNode?.baseRefName ?? options.sourceBranch;
  const targetBranchesFromLabels = getTargetBranchesFromLabels({
    sourceBranch,
    existingTargetPullRequests,
    branchLabelMapping: options.branchLabelMapping,
    labels: getPullRequestLabels(pullRequestNode),
  });

  const formattedMessage = getFormattedCommitMessage({
    message: commitMessage,
    pullNumber,
    sha,
  });

  return {
    committedDate: sourceCommit.committedDate,
    sourceBranch, // TODO can this be deleted since it's already in `options`?
    targetBranchesFromLabels,
    sha: sourceCommit.oid,
    formattedMessage,
    originalMessage: commitMessage,
    pullNumber,
    pullUrl: pullRequestNode?.url,
    existingTargetPullRequests,
  };
}

export const sourceCommitWithTargetPullRequestFragment = {
  name: 'SourceCommitWithTargetPullRequest',
  source: /* GraphQL */ `
    fragment InnerCommitNode on Commit {
      repository {
        name
        owner {
          login
        }
      }
      oid
      message
      committedDate
    }

    fragment SourceCommitWithTargetPullRequest on Commit {
      ...InnerCommitNode
      associatedPullRequests(first: 1) {
        edges {
          node {
            # Source PR
            url
            number
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
                    targetPullRequest: source {
                      __typename

                      # Target PRs
                      ... on PullRequest {
                        url
                        title
                        state
                        baseRefName
                        number
                        commits(first: 20) {
                          edges {
                            node {
                              targetCommit: commit {
                                ...InnerCommitNode
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
        }
      }
    }
  `,
};

export type ExistingTargetPullRequests = ReturnType<
  typeof getExistingTargetPullRequests
>;
export function getExistingTargetPullRequests(
  sourceCommit: SourceCommitWithTargetPullRequest
) {
  const sourcePullRequest =
    sourceCommit.associatedPullRequests.edges?.[0]?.node;
  if (!sourcePullRequest) {
    return [];
  }

  const sourceCommitMessage = getFirstCommitMessageLine(sourceCommit.message);

  return sourcePullRequest.timelineItems.edges
    .filter(filterNil)
    .filter(filterPullRequests)
    .filter((item) => {
      const { targetPullRequest } = item.node;

      // ignore closed PRs
      if (targetPullRequest.state === 'CLOSED') {
        return false;
      }

      // at least one of the commits in `targetPullRequest` should match the merge commit from the source pull request
      const didCommitMatch = targetPullRequest.commits.edges.some(
        (commitEdge) => {
          const { targetCommit } = commitEdge.node;

          const matchingRepoName =
            sourceCommit.repository.name === targetCommit.repository.name;

          const matchingRepoOwner =
            sourceCommit.repository.owner.login ===
            targetCommit.repository.owner.login;

          const targetCommitMessage = getFirstCommitMessageLine(
            targetCommit.message
          );

          const matchingMessage = targetCommitMessage === sourceCommitMessage;

          return matchingRepoName && matchingRepoOwner && matchingMessage;
        }
      );

      const titleIncludesMessage =
        targetPullRequest.title.includes(sourceCommitMessage);

      const titleIncludesNumber = targetPullRequest.title.includes(
        sourcePullRequest.number.toString()
      );

      return didCommitMatch || (titleIncludesMessage && titleIncludesNumber);
    })
    .map((item) => {
      const { targetPullRequest } = item.node;
      return {
        url: targetPullRequest.url,
        number: targetPullRequest.number,
        branch: targetPullRequest.baseRefName,
        state: targetPullRequest.state,
      };
    });
}

// narrow TimelineEdge to TimelinePullRequestEdge
function filterPullRequests(
  item: TimelineEdge
): item is TimelinePullRequestEdge {
  const { targetPullRequest } = item.node;
  return targetPullRequest.__typename === 'PullRequest';
}
