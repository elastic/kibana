import { BackportOptions } from '../../options/options';
import { CommitChoice } from './Commit';
import { fetchAuthorId } from './fetchAuthorId';
import {
  getFirstCommitMessageLine,
  getFormattedCommitMessage
} from './commitFormatters';
import { gqlRequest } from './gqlRequest';
import { HandledError } from '../HandledError';

export async function fetchCommitsByAuthor(
  options: BackportOptions
): Promise<CommitChoice[]> {
  const {
    accessToken,
    apiHostname,
    commitsCount,
    path,
    repoName,
    repoOwner,
    sourceBranch
  } = options;

  const query = /* GraphQL */ `
    query getCommitsByAuthorQuery(
      $repoOwner: String!
      $repoName: String!
      $commitsCount: Int!
      $sourceBranch: String!
      $authorId: ID
      $historyPath: String
    ) {
      repository(owner: $repoOwner, name: $repoName) {
        ref(qualifiedName: $sourceBranch) {
          target {
            ... on Commit {
              history(
                first: $commitsCount
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
  const res = await gqlRequest<DataResponse>({
    apiHostname,
    accessToken,
    query,
    variables: {
      repoOwner,
      repoName,
      sourceBranch,
      commitsCount: commitsCount || 10,
      authorId,
      historyPath: path || null
    }
  });

  if (res.repository.ref === null) {
    throw new HandledError(
      `The upstream branch "${sourceBranch}" does not exist. Try specifying a different branch with "--sourceBranch <your-branch>"`
    );
  }

  return res.repository.ref.target.history.edges.map(edge => {
    const historyNode = edge.node;
    const associatedPullRequest = getAssociatedPullRequest(
      historyNode.associatedPullRequests.edges[0],
      options
    );

    const existingBackports = getExistingBackportPRs(
      historyNode.message,
      associatedPullRequest
    );

    const sha = historyNode.oid;
    const firstMessageLine = getFirstCommitMessageLine(historyNode.message);
    const pullNumber =
      associatedPullRequest?.node.number ||
      getPullNumberFromMessage(firstMessageLine);

    const message = getFormattedCommitMessage({
      message: firstMessageLine,
      pullNumber,
      sha
    });

    return {
      branch: sourceBranch,
      sha,
      message,
      pullNumber,
      existingBackports
    };
  });
}

function getPullNumberFromMessage(firstMessageLine: string) {
  const matches = firstMessageLine.match(/\(#(\d+)\)/);
  if (matches) {
    return parseInt(matches[1], 10);
  }
}

function getAssociatedPullRequest(
  pullRequestEdge: PullRequestEdge | undefined,
  options: BackportOptions
) {
  const isAssociated =
    pullRequestEdge &&
    pullRequestEdge.node.repository.name === options.repoName &&
    pullRequestEdge.node.repository.owner.login === options.repoOwner;

  if (isAssociated) {
    return pullRequestEdge;
  }
}

export function getExistingBackportPRs(
  message: string,
  pullRequest: PullRequestEdge | undefined
) {
  if (!pullRequest) {
    return [];
  }
  const firstMessageLine = getFirstCommitMessageLine(message);
  return pullRequest.node.timelineItems.edges
    .filter(notEmpty)
    .filter(item => {
      const { source } = item.node;
      return (
        source.__typename === 'PullRequest' &&
        (source.state === 'MERGED' || source.state === 'OPEN') &&
        source.commits.edges.some(
          commit =>
            getFirstCommitMessageLine(commit.node.commit.message) ===
            firstMessageLine
        )
      );
    })
    .map(item => {
      const { source } = item.node;
      return {
        branch: source.baseRefName,
        state: source.state
      };
    });
}

function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
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
