import chalk from 'chalk';
import ora from 'ora';
import { BackportOptions } from '../../../options/options';
import { Commit } from '../../../types/Commit';
import { HandledError } from '../../HandledError';
import {
  getFormattedCommitMessage,
  getShortSha,
  getPullNumberFromMessage,
} from '../commitFormatters';
import { apiRequestV4 } from './apiRequestV4';
import {
  PullRequestNode,
  pullRequestFragment,
  pullRequestFragmentName,
  getExistingTargetPullRequests,
  getPullRequestLabels,
} from './getExistingTargetPullRequests';
import { getTargetBranchesFromLabels } from './getTargetBranchesFromLabels';

export async function fetchCommitBySha(
  options: BackportOptions & { sha: string }
): Promise<Commit> {
  const { accessToken, githubApiBaseUrlV4, repoName, repoOwner } = options;

  const query = /* GraphQL */ `
  query CommitsBySha($repoOwner: String!, $repoName: String!, $oid: String!) {
    repository(owner: $repoOwner, name: $repoName) {
      object(expression: $oid) {
        ... on Commit {
          message
          oid
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

    ${pullRequestFragment}
  `;

  const spinner = ora(`Loading commit "${getShortSha(options.sha)}"`).start();

  let res: DataResponse;
  try {
    res = await apiRequestV4<DataResponse>({
      githubApiBaseUrlV4,
      accessToken,
      query,
      variables: {
        repoOwner,
        repoName,
        oid: options.sha,
      },
    });
    spinner.stop();
  } catch (e) {
    spinner.fail();
    throw e;
  }

  if (!res.repository.object) {
    throw new HandledError(
      `No commit found on branch "${options.sourceBranch}" with sha "${options.sha}"`
    );
  }

  const sha = res.repository.object.oid;
  const commitMessage = res.repository.object.message;
  const pullRequestNode =
    res.repository.object.associatedPullRequests.edges?.[0]?.node;

  const pullNumber =
    pullRequestNode?.number || getPullNumberFromMessage(commitMessage);

  const sourceBranch = pullRequestNode?.baseRefName || options.sourceBranch;

  const formattedMessage = getFormattedCommitMessage({
    message: commitMessage,
    pullNumber,
    sha,
  });

  spinner.stopAndPersist({
    symbol: chalk.green('?'),
    text: `${chalk.bold('Select commit')} ${chalk.cyan(formattedMessage)}`,
  });

  const existingTargetPullRequests = getExistingTargetPullRequests(
    commitMessage,
    pullRequestNode
  );

  const targetBranchesFromLabels = getTargetBranchesFromLabels({
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
}

interface DataResponse {
  repository: {
    object: {
      message: string;
      oid: string;
      associatedPullRequests: {
        edges:
          | {
              node: PullRequestNode;
            }[]
          | null;
      };
    } | null;
  };
}
