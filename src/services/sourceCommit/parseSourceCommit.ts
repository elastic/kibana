import { isEmpty } from 'lodash';
import { ValidConfigOptions } from '../../options/options';
import { extractPullNumber } from '../github/commitFormatters';
import {
  ExpectedTargetPullRequest,
  getExpectedTargetPullRequests,
} from './getExpectedTargetPullRequests';

export interface Commit {
  // source commit
  committedDate: string;
  sourceBranch: string;
  sha: string;
  originalMessage: string; // TODO: rename to message
  pullNumber?: number;
  pullUrl?: string;

  // target pull requests
  expectedTargetPullRequests: ExpectedTargetPullRequest[];
}

export interface SourcePullRequestNode {
  baseRefName: string;
  url: string;
  number: number;
  labels: {
    nodes: {
      name: string;
    }[];
  };
  sourceMergeCommit: {
    oid: string;
    message: string;
  };
  timelineItems: {
    edges: TimelineEdge[];
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

      targetMergeCommit: {
        oid: string;
        message: string;
      } | null;

      repository: {
        name: string;
        owner: {
          login: string;
        };
      };

      commits: {
        edges: Array<{
          node: { targetCommit: { message: string; oid: string } };
        }>;
      };
    };
  };
}

interface TimelineIssueEdge {
  node: { targetPullRequest: { __typename: 'Issue' } };
}

export type SourceCommitWithTargetPullRequest = {
  repository: {
    name: string;
    owner: { login: string };
  };
  oid: string;
  message: string;
  committedDate: string;
  associatedPullRequests: {
    edges: { node: SourcePullRequestNode }[] | null;
  };
};

export function parseSourceCommit({
  sourceCommit,
  options,
}: {
  sourceCommit: SourceCommitWithTargetPullRequest;
  options: {
    branchLabelMapping?: ValidConfigOptions['branchLabelMapping'];
    historicalBranchLabelMappings: ValidConfigOptions['historicalBranchLabelMappings'];
    sourceBranch: string;
  };
}): Commit {
  const sourcePullRequest =
    sourceCommit.associatedPullRequests.edges?.[0]?.node;

  // use info from associated pull request if available. Fall back to commit info
  const commitMessage =
    sourcePullRequest?.sourceMergeCommit.message ?? sourceCommit.message;
  const commitSha =
    sourcePullRequest?.sourceMergeCommit.oid ?? sourceCommit.oid;
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
    sha: commitSha,
    originalMessage: commitMessage,
    pullNumber,
    pullUrl: sourcePullRequest?.url,
    expectedTargetPullRequests,
  };
}

export const sourceCommitWithTargetPullRequestFragment = {
  source: /* GraphQL */ `
    fragment SourceCommitWithTargetPullRequest on Commit {
      # Source Commit
      repository {
        name
        owner {
          login
        }
      }
      oid
      message
      committedDate

      # Source pull request: PR where source commit was merged in
      associatedPullRequests(first: 1) {
        edges {
          node {
            url
            number
            labels(first: 50) {
              nodes {
                name
              }
            }
            baseRefName

            # source merge commit (the commit that actually went into the source branch)
            sourceMergeCommit: mergeCommit {
              oid
              message
            }

            # (possible) backport pull requests referenced in the source pull request
            timelineItems(last: 20, itemTypes: CROSS_REFERENCED_EVENT) {
              edges {
                node {
                  ... on CrossReferencedEvent {
                    targetPullRequest: source {
                      __typename

                      # Target PRs (backport PRs)
                      ... on PullRequest {
                        # target merge commit: the backport commit that was merged into the target branch
                        targetMergeCommit: mergeCommit {
                          oid
                          message
                        }
                        repository {
                          name
                          owner {
                            login
                          }
                        }
                        url
                        title
                        state
                        baseRefName
                        number
                        commits(first: 20) {
                          edges {
                            node {
                              targetCommit: commit {
                                message
                                oid
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
  branchLabelMapping?: ValidConfigOptions['branchLabelMapping'],
  historicalBranchLabelMappings: ValidConfigOptions['historicalBranchLabelMappings'] = []
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
    historicalBranchLabelMappings[0].branchLabelMapping
  );
}
