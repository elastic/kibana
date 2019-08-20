import get from 'lodash.get';
import { BackportOptions } from '../../options/options';
import { CommitChoice } from './Commit';
import { fetchAuthorId } from './fetchAuthorId';
import {
  getFirstCommitMessageLine,
  withFormattedCommitMessage
} from './commitFormatters';
import { gqlRequest } from './gqlRequest';

export interface DataResponse {
  repository: {
    ref: {
      target: {
        history: {
          edges: HistoryEdge[];
        };
      };
    };
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

export async function fetchCommitsByAuthor(
  options: BackportOptions
): Promise<CommitChoice[]> {
  const {
    accessToken,
    apiHostname,
    commitsCount,
    path,
    repoName,
    repoOwner
  } = options;

  const query = /* GraphQL */ `
    query getCommitsByAuthorQuery(
      $repoOwner: String!
      $repoName: String!
      $commitsCount: Int!
      $authorId: ID
      $historyPath: String
    ) {
      repository(owner: $repoOwner, name: $repoName) {
        ref(qualifiedName: "master") {
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
      commitsCount: commitsCount || 10,
      authorId,
      historyPath: path || null
    }
  });

  return res.repository.ref.target.history.edges.map(edge => {
    const historyNode = edge.node;
    const firstPullRequest = historyNode.associatedPullRequests.edges[0];
    const pullNumber = get(firstPullRequest, 'node.number');
    const existingBackports = getExistingBackportPRs(
      historyNode.message,
      firstPullRequest
    );

    return withFormattedCommitMessage({
      sha: historyNode.oid,
      message: historyNode.message,
      pullNumber,
      existingBackports
    });
  });
}

export function getExistingBackportPRs(
  message: string,
  pullRequest?: PullRequestEdge
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
