import isEmpty from 'lodash.isempty';
import ora from 'ora';
import { BackportOptions } from '../../../options/options';
import { CommitChoice } from '../../../types/Commit';
import { HandledError } from '../../HandledError';
import { getFormattedCommitMessage } from '../commitFormatters';
import { apiRequestV4 } from './apiRequestV4';
import { getTargetBranchesFromLabels } from './getTargetBranchesFromLabels';

export async function fetchPullRequestBySearchQuery(
  options: BackportOptions
): Promise<CommitChoice[]> {
  const {
    accessToken,
    all,
    author,
    branchLabelMapping,
    githubApiBaseUrlV4,
    maxNumber,
    repoName,
    repoOwner,
    sourceBranch,
    sourcePRsFilter,
  } = options;
  const query = /* GraphQL */ `
    query getPulLRequestBySearchQuery($query: String!, $first: Int!) {
      search(query: $query, type: ISSUE, first: $first) {
        nodes {
          ... on PullRequest {
            number
            labels(first: 50) {
              nodes {
                name
              }
            }
            mergeCommit {
              oid
              message
            }
          }
        }
      }
    }
  `;

  const authorFilter = all ? '' : `author:${author}`;
  const searchQuery = `type:pr is:merged sort:updated-desc repo:${repoOwner}/${repoName} ${authorFilter} ${sourcePRsFilter} base:${sourceBranch}`;
  const spinner = ora('Loading pull requests...').start();
  let res: DataResponse;
  try {
    res = await apiRequestV4<DataResponse>({
      githubApiBaseUrlV4,
      accessToken,
      query,
      variables: {
        query: searchQuery,
        first: maxNumber,
      },
    });
    spinner.stop();
  } catch (e) {
    spinner.fail();
    throw e;
  }

  const commits = res.search.nodes.map((searchNode) => {
    const labels = searchNode.labels.nodes.map((labelNode) => labelNode.name);

    const selectedTargetBranches = getTargetBranchesFromLabels({
      labels,
      branchLabelMapping,
    });
    const sha = searchNode.mergeCommit.oid;
    const pullNumber = searchNode.number;
    const formattedMessage = getFormattedCommitMessage({
      message: searchNode.mergeCommit.message,
      sha,
      pullNumber,
    });

    const choice: CommitChoice = {
      sourceBranch,
      selectedTargetBranches,
      sha,
      formattedMessage,
      pullNumber,
      existingTargetPullRequests: [],
    };

    return choice;
  });

  // terminate if not commits were found
  if (isEmpty(commits)) {
    const errorText = options.all
      ? `There are no pull requests matching the filter "${sourcePRsFilter}"`
      : `There are no commits by "${options.author}" matching the filter "${sourcePRsFilter}". Try with \`--all\` for commits by all users or \`--author=<username>\` for commits from a specific user`;

    throw new HandledError(errorText);
  }

  return commits;
}

interface DataResponse {
  search: {
    nodes: {
      number: number;
      labels: {
        nodes: {
          name: string;
        }[];
      };
      mergeCommit: {
        oid: string;
        message: string;
      };
    }[];
  };
}
