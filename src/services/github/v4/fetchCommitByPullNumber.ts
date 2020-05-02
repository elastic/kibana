import chalk from 'chalk';
import ora from 'ora';
import { BackportOptions } from '../../../options/options';
import { CommitSelected } from '../../../types/Commit';
import { HandledError } from '../../HandledError';
import { getFormattedCommitMessage } from '../commitFormatters';
import { apiRequestV4 } from './apiRequestV4';
import { getTargetBranchesFromLabels } from './getTargetBranchesFromLabels';

export async function fetchCommitByPullNumber(
  options: BackportOptions & { pullNumber: number }
): Promise<CommitSelected> {
  const {
    githubApiBaseUrlV4,
    repoName,
    repoOwner,
    pullNumber,
    accessToken,
    branchLabelMapping,
  } = options;
  const query = /* GraphQL */ `
    query getCommitbyPullNumber(
      $repoOwner: String!
      $repoName: String!
      $pullNumber: Int!
    ) {
      repository(owner: $repoOwner, name: $repoName) {
        pullRequest(number: $pullNumber) {
          baseRef {
            name
          }
          mergeCommit {
            oid
            message
          }
          labels(first: 50) {
            nodes {
              name
            }
          }
        }
      }
    }
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

  if (res.repository.pullRequest.mergeCommit === null) {
    throw new HandledError(`The PR #${pullNumber} is not merged`);
  }

  const sourceBranch = res.repository.pullRequest.baseRef.name;
  const sha = res.repository.pullRequest.mergeCommit.oid;
  const formattedMessage = getFormattedCommitMessage({
    message: res.repository.pullRequest.mergeCommit.message,
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

  const labels = res.repository.pullRequest.labels.nodes.map(
    (label) => label.name
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
  };
}

interface DataResponse {
  repository: {
    pullRequest: {
      baseRef: {
        name: string;
      };
      mergeCommit: {
        oid: string;
        message: string;
      } | null;
      labels: {
        nodes: {
          name: string;
        }[];
      };
    };
  };
}
