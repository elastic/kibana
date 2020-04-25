import { BackportOptions } from '../../../options/options';
import { CommitChoice } from '../../../types/Commit';
import { filterEmpty } from '../../../utils/filterEmpty';
import { HandledError } from '../../HandledError';
import {
  getFirstCommitMessageLine,
  getFormattedCommitMessage,
} from '../commitFormatters';
import { apiRequestV4 } from './apiRequestV4';
import { fetchAuthorId } from './fetchAuthorId';
import { getTargetBranchesFromLabels } from './getTargetBranchesFromLabels';

export async function fetchCommitsByAuthor(
  options: BackportOptions
): Promise<CommitChoice[]> {
  const {
    accessToken,
    branchLabelMapping,
    githubApiBaseUrlV4,
    maxNumber,
    path,
    repoName,
    repoOwner,
    sourceBranch,
  } = options;

  const query = /* GraphQL */ `
    query getCommitsByAuthorQuery(
      $repoOwner: String!
      $repoName: String!
      $maxNumber: Int!
      $sourceBranch: String!
      $authorId: ID
      $historyPath: String
    ) {
      repository(owner: $repoOwner, name: $repoName) {
        ref(qualifiedName: $sourceBranch) {
          target {
            ... on Commit {
              history(
                first: $maxNumber
                author: { id: $authorId }
                path: $historyPath
              ) {
                edges {
                  node {
                    oid
                    message
                    associatedPullRequests(first: 1) {
                      edges {
                        node {
                          repository {
                            owner {
                              login
                            }
                            name
                          }
                          number
                          mergeCommit {
                            oid
                          }
                          labels(first: 50) {
                            nodes {
                              name
                            }
                          }
                          timelineItems(
                            last: 20
                            itemTypes: CROSS_REFERENCED_EVENT
                          ) {
                            edges {
                              node {
                                ... on CrossReferencedEvent {
                                  source {
                                    __typename
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

  const authorId = await fetchAuthorId(options);
  const res = await apiRequestV4<DataResponse>({
    githubApiBaseUrlV4,
    accessToken,
    query,
    variables: {
      repoOwner,
      repoName,
      sourceBranch,
      maxNumber: maxNumber || 10,
      authorId,
      historyPath: path || null,
    },
  });

  if (res.repository.ref === null) {
    throw new HandledError(
      `The upstream branch "${sourceBranch}" does not exist. Try specifying a different branch with "--sourceBranch <your-branch>"`
    );
  }

  return res.repository.ref.target.history.edges.map((edge) => {
    // it is assumed that there can only be a single PR associated with a commit
    // that assumption might not hold true forever but for now it works out
    const pullRequestEdge = edge.node.associatedPullRequests.edges[0];
    const commitMessage = edge.node.message;
    const sha = edge.node.oid;

    // get the source pull request unless the commit was merged directly
    const sourcePullRequest = getSourcePullRequest({
      pullRequestEdge,
      options,
      sha,
    });

    // find any existing target pull requests
    const existingTargetPullRequests = getExistingTargetPullRequests(
      commitMessage,
      sourcePullRequest
    );

    const pullNumber =
      sourcePullRequest?.node.number || getPullNumberFromMessage(commitMessage);

    const formattedMessage = getFormattedCommitMessage({
      message: commitMessage,
      pullNumber,
      sha,
    });

    const labels = sourcePullRequest?.node.labels.nodes.map(
      (node) => node.name
    );
    const selectedTargetBranches = getTargetBranchesFromLabels({
      labels,
      branchLabelMapping,
    });

    return {
      sourceBranch,
      selectedTargetBranches,
      sha,
      formattedMessage,
      pullNumber,
      existingTargetPullRequests,
    };
  });
}

function getPullNumberFromMessage(firstMessageLine: string) {
  const matches = firstMessageLine.match(/\(#(\d+)\)/);
  if (matches) {
    return parseInt(matches[1], 10);
  }
}

function getSourcePullRequest({
  pullRequestEdge,
  options,
  sha,
}: {
  pullRequestEdge: PullRequestEdge | undefined;
  options: BackportOptions;
  sha: string;
}) {
  if (
    pullRequestEdge?.node.repository.name === options.repoName &&
    pullRequestEdge?.node.repository.owner.login === options.repoOwner &&
    pullRequestEdge?.node.mergeCommit.oid === sha
  ) {
    return pullRequestEdge;
  }
}

export function getExistingTargetPullRequests(
  commitMessage: string,
  sourcePullRequest: PullRequestEdge | undefined
) {
  if (!sourcePullRequest) {
    return [];
  }

  const firstMessageLine = getFirstCommitMessageLine(commitMessage);
  return sourcePullRequest.node.timelineItems.edges
    .filter(filterEmpty)
    .filter((item) => {
      const { source } = item.node;

      const isPullRequest = source.__typename === 'PullRequest';
      const isMergedOrOpen =
        source.state === 'MERGED' || source.state === 'OPEN';

      if (!isPullRequest || !isMergedOrOpen) {
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
        sourcePullRequest.node.number.toString()
      );

      return (
        isPullRequest &&
        isMergedOrOpen &&
        (commitMatch || (prTitleMatch && prNumberMatch))
      );
    })
    .map((item) => {
      const { source } = item.node;
      return {
        branch: source.baseRefName,
        state: source.state,
      };
    });
}

export interface DataResponse {
  repository: {
    ref: {
      target: {
        history: {
          edges: HistoryEdge[];
        };
      };
    } | null;
  };
}

interface HistoryEdge {
  node: {
    oid: string;
    message: string;
    associatedPullRequests: {
      edges: PullRequestEdge[];
    };
  };
}

export interface PullRequestEdge {
  node: {
    number: number;
    mergeCommit: {
      oid: string;
    };
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
  };
}

export interface TimelineItemEdge {
  node: {
    source: {
      __typename: string;
      title: string;
      state: 'OPEN' | 'CLOSED' | 'MERGED';
      baseRefName: string;
      commits: {
        edges: CommitEdge[];
      };
    };
  };
}

interface CommitEdge {
  node: {
    commit: {
      message: string;
    };
  };
}
