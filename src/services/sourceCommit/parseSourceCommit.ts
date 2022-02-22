import gql from 'graphql-tag';
import { ValidConfigOptions } from '../../options/options';
import {
  RemoteConfigHistory,
  RemoteConfigHistoryFragment,
} from '../remoteConfig';
import {
  ExpectedTargetPullRequest,
  getExpectedTargetPullRequests,
} from './getExpectedTargetPullRequests';

export interface Commit {
  author: SourceCommitWithTargetPullRequest['author'];
  sourceCommit: {
    committedDate: string;
    message: string;
    sha: string;
  };
  sourcePullRequest?: {
    number: number;
    url: string;
    mergeCommit: {
      message: string;
      sha: string;
    };
  };
  sourceBranch: string;
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
  mergeCommit: {
    remoteConfigHistory: RemoteConfigHistory['remoteConfigHistory'];
    sha: string;
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
        sha: string;
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
          node: { targetCommit: { message: string; sha: string } };
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
  sha: string;
  message: string;
  committedDate: string;
  author: {
    name: string;
    email: string;
  };

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
    sourceBranch: string;
  };
}): Commit {
  const sourcePullRequest =
    sourceCommit.associatedPullRequests.edges?.[0]?.node;

  return {
    author: sourceCommit.author,
    sourceCommit: {
      committedDate: sourceCommit.committedDate,
      message: sourceCommit.message,
      sha: sourceCommit.sha,
    },
    sourcePullRequest: sourcePullRequest
      ? {
          number: sourcePullRequest.number,
          url: sourcePullRequest.url,
          mergeCommit: {
            message: sourcePullRequest.mergeCommit.message,
            sha: sourcePullRequest.mergeCommit.sha,
          },
        }
      : undefined,
    sourceBranch: sourcePullRequest?.baseRefName ?? options.sourceBranch,
    expectedTargetPullRequests: getExpectedTargetPullRequests({
      sourceCommit,
      latestBranchLabelMapping: options.branchLabelMapping,
    }),
  };
}

export const SourceCommitWithTargetPullRequestFragment = gql`
  fragment SourceCommitWithTargetPullRequestFragment on Commit {
    # Source Commit
    repository {
      name
      owner {
        login
      }
    }
    sha: oid
    message
    committedDate

    author {
      name
      email
    }

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
          mergeCommit {
            ...RemoteConfigHistoryFragment
            sha: oid
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
                        sha: oid
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
                              sha: oid
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

  ${RemoteConfigHistoryFragment}
`;
