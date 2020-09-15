import isEmpty from 'lodash.isempty';
import ora from 'ora';
import { ValidConfigOptions } from '../../../options/options';
import { Commit } from '../../../types/Commit';
import { HandledError } from '../../HandledError';
import {
  getFormattedCommitMessage,
  getPullNumberFromMessage,
} from '../commitFormatters';
import { apiRequestV4 } from './apiRequestV4';
import { fetchAuthorId } from './fetchAuthorId';
import {
  pullRequestFragment,
  pullRequestFragmentName,
  PullRequestNode,
  getExistingTargetPullRequests,
  getPullRequestLabels,
} from './getExistingTargetPullRequests';
import { getTargetBranchesFromLabels } from './getTargetBranchesFromLabels';

export async function fetchCommitsByAuthor(
  options: ValidConfigOptions
): Promise<Commit[]> {
  const {
    accessToken,

    githubApiBaseUrlV4,
    maxNumber,
    path,
    repoName,
    repoOwner,
    sourceBranch,
  } = options;

  const query = /* GraphQL */ `
    query CommitsByAuthor(
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
                          ...${pullRequestFragmentName}
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

    ${pullRequestFragment}
  `;

  const spinner = ora(
    `Loading commits from branch "${sourceBranch}"...`
  ).start();
  let res: DataResponse;
  try {
    const authorId = await fetchAuthorId(options);
    res = await apiRequestV4<DataResponse>({
      githubApiBaseUrlV4,
      accessToken,
      query,
      variables: {
        repoOwner,
        repoName,
        sourceBranch,
        maxNumber,
        authorId,
        historyPath: path || null,
      },
    });
    spinner.stop();
  } catch (e) {
    spinner.fail();
    throw e;
  }

  if (res.repository.ref === null) {
    throw new HandledError(
      `The upstream branch "${sourceBranch}" does not exist. Try specifying a different branch with "--source-branch <your-branch>"`
    );
  }

  const commits = res.repository.ref.target.history.edges.map((edge) => {
    const commitMessage = edge.node.message;
    const sha = edge.node.oid;

    // it is assumed that there can only be a single PR associated with a commit
    // that assumption might not hold true forever but for now it works out
    const pullRequestNode = edge.node.associatedPullRequests.edges[0]?.node;

    // the source pull request for the commit cannot be retrieved
    // This happens if the commits was pushed directly to a branch (not merging via a PR)
    if (!isSourcePullRequest({ pullRequestNode, options, sha })) {
      const pullNumber = getPullNumberFromMessage(commitMessage);
      const formattedMessage = getFormattedCommitMessage({
        message: commitMessage,
        pullNumber,
        sha,
      });

      return {
        sourceBranch,
        targetBranchesFromLabels: [],
        sha,
        formattedMessage,
        originalMessage: commitMessage,
        pullNumber,
        existingTargetPullRequests: [],
      };
    }

    const pullNumber = pullRequestNode.number;
    const formattedMessage = getFormattedCommitMessage({
      message: commitMessage,
      pullNumber,
      sha,
    });

    const existingTargetPullRequests = getExistingTargetPullRequests(
      pullRequestNode
    );

    const targetBranchesFromLabels = getTargetBranchesFromLabels({
      sourceBranch: pullRequestNode.baseRefName,
      existingTargetPullRequests,
      branchLabelMapping: options.branchLabelMapping,
      labels: getPullRequestLabels(pullRequestNode),
    });

    return {
      sourceBranch,
      targetBranchesFromLabels,
      sha,
      formattedMessage,
      originalMessage: commitMessage,
      pullNumber,
      existingTargetPullRequests,
    };
  });

  // terminate if not commits were found
  if (isEmpty(commits)) {
    const pathText = options.path
      ? ` touching files in path: "${options.path}"`
      : '';

    const errorText = options.all
      ? `There are no commits in this repository${pathText}`
      : `There are no commits by "${options.author}" in this repository${pathText}. Try with \`--all\` for commits by all users or \`--author=<username>\` for commits from a specific user`;

    throw new HandledError(errorText);
  }

  return commits;
}

function isSourcePullRequest({
  pullRequestNode,
  options,
  sha,
}: {
  pullRequestNode: PullRequestNode | undefined;
  options: ValidConfigOptions;
  sha: string;
}) {
  return (
    pullRequestNode?.repository.name === options.repoName &&
    pullRequestNode.repository.owner.login === options.repoOwner &&
    pullRequestNode.mergeCommit?.oid === sha
  );
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
      edges: {
        node: PullRequestNode;
      }[];
    };
  };
}
