import { isEmpty } from 'lodash';
import { ValidConfigOptions } from '../../options/options';
import { extractPullNumber } from '../github/commitFormatters';
import {
  ExpectedTargetPullRequest,
  getExpectedTargetPullRequests,
} from './getExpectedTargetPullRequests';

export interface Commit {
  committedDate: string;
  sourceBranch: string;
  sha: string;
  originalMessage: string; // TODO: rename to message
  pullNumber?: number;
  pullUrl?: string;
  expectedTargetPullRequests: ExpectedTargetPullRequest[];
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

export type TimelineEdge = TimelinePullRequestEdge | TimelineIssueEdge;

export interface TimelinePullRequestEdge {
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

export function parseSourceCommit({
  sourceCommit,
  options,
}: {
  sourceCommit: SourceCommitWithTargetPullRequest;
  options: ValidConfigOptions;
}): Commit {
  const sourcePullRequest =
    sourceCommit.associatedPullRequests.edges?.[0]?.node;
  const commitMessage = sourceCommit.message;
  const pullNumber =
    sourcePullRequest?.number ?? extractPullNumber(commitMessage);
  const sourceBranch = sourcePullRequest?.baseRefName ?? options.sourceBranch;
  const branchLabelMapping = getBranchLabelMappingForCommit(
    sourceCommit,
    options.branchLabelMapping,
    options.historicalBranchLabelMappings
  );

  const expectedTargetPullRequests = getExpectedTargetPullRequests(
    sourceCommit,
    branchLabelMapping
  );

  return {
    committedDate: sourceCommit.committedDate,
    sourceBranch,
    sha: sourceCommit.oid,
    originalMessage: commitMessage,
    pullNumber,
    pullUrl: sourcePullRequest?.url,
    expectedTargetPullRequests,
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

function getBranchLabelMappingForCommit(
  sourceCommit: SourceCommitWithTargetPullRequest,
  branchLabelMapping: ValidConfigOptions['branchLabelMapping'],
  historicalBranchLabelMappings: ValidConfigOptions['historicalBranchLabelMappings']
): Record<string, string> | undefined {
  if (isEmpty(historicalBranchLabelMappings)) {
    return branchLabelMapping;
  }

  const match = historicalBranchLabelMappings.find(
    (branchLabelMapping) =>
      sourceCommit.committedDate > branchLabelMapping.committedDate
  );

  return (
    match?.branchLabelMapping ??
    historicalBranchLabelMappings[0]?.branchLabelMapping
  );
}
