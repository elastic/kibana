import chalk from 'chalk';
import ora from 'ora';
import { ValidConfigOptions } from '../../../options/options';
import { Commit } from '../../../types/Commit';
import { HandledError } from '../../HandledError';
import { getFormattedCommitMessage } from '../commitFormatters';
import { apiRequestV4 } from './apiRequestV4';
import {
  PullRequestNode,
  pullRequestFragment,
  pullRequestFragmentName,
  getExistingTargetPullRequests,
  getPullRequestLabels,
} from './getExistingTargetPullRequests';
import { getTargetBranchesFromLabels } from './getTargetBranchesFromLabels';

export async function fetchCommitByPullNumber(
  options: ValidConfigOptions & { pullNumber: number }
): Promise<Commit> {
  const {
    accessToken,
    githubApiBaseUrlV4,
    pullNumber,
    repoName,
    repoOwner,
  } = options;
  const query = /* GraphQL */ `
    query CommitByPullNumber(
      $repoOwner: String!
      $repoName: String!
      $pullNumber: Int!
    ) {
      repository(owner: $repoOwner, name: $repoName) {
        pullRequest(number: $pullNumber) {
          ...${pullRequestFragmentName}
        }
      }
    }

    ${pullRequestFragment}
  `;

  const spinner = ora(
    `Loading merge commit from pull request #${options.pullNumber}`
  ).start();

  let res: DataResponse;
  try {
    res = await apiRequestV4<DataResponse>({
      githubApiBaseUrlV4,
      accessToken,
      query,
      variables: {
        repoOwner,
        repoName,
        pullNumber,
      },
    });
    spinner.stop();
  } catch (e) {
    spinner.fail();
    throw e;
  }

  const pullRequestNode = res.repository.pullRequest;

  if (pullRequestNode.mergeCommit === null) {
    throw new HandledError(`The PR #${pullNumber} is not merged`);
  }

  const sourceBranch = pullRequestNode.baseRefName;
  const sha = pullRequestNode.mergeCommit.oid;
  const commitMessage = pullRequestNode.mergeCommit.message;
  const formattedMessage = getFormattedCommitMessage({
    message: commitMessage,
    sha,
    pullNumber,
  });

  // add styles to make it look like a prompt question
  spinner.stopAndPersist({
    symbol: chalk.green('?'),
    text: `${chalk.bold('Select pull request')} ${chalk.cyan(
      formattedMessage
    )}`,
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
}

interface DataResponse {
  repository: {
    pullRequest: PullRequestNode;
  };
}
