import { isEmpty } from 'lodash';
import ora from 'ora';
import { ValidConfigOptions } from '../../../options/options';
import { Commit } from '../../../types/Commit';
import { HandledError } from '../../HandledError';
import { getFormattedCommitMessage } from '../commitFormatters';
import { apiRequestV4 } from './apiRequestV4';
import {
  pullRequestFragment,
  PullRequestNode,
  getExistingTargetPullRequests,
  getPullRequestLabels,
} from './getExistingTargetPullRequests';
import { getTargetBranchesFromLabels } from './getTargetBranchesFromLabels';

export async function fetchPullRequestBySearchQuery(
  options: ValidConfigOptions
): Promise<Commit[]> {
  const {
    accessToken,
    all,
    author,
    githubApiBaseUrlV4,
    maxNumber,
    prFilter,
    repoName,
    repoOwner,
    sourceBranch,
  } = options;
  const query = /* GraphQL */ `
    query PullRequestBySearchQuery($query: String!, $maxNumber: Int!) {
      search(query: $query, type: ISSUE, first: $maxNumber) {
        nodes {
          ... on PullRequest {
            ...${pullRequestFragment.name}
          }
        }
      }
    }

    ${pullRequestFragment.source}
  `;

  const authorFilter = all ? '' : `author:${author}`;
  const searchQuery = `type:pr is:merged sort:updated-desc repo:${repoOwner}/${repoName} ${authorFilter} ${prFilter} base:${sourceBranch}`;
  const spinner = ora('Loading pull requests...').start();
  let res: PullRequestBySearchQueryResponse;

  try {
    res = await apiRequestV4<PullRequestBySearchQueryResponse>({
      githubApiBaseUrlV4,
      accessToken,
      query,
      variables: {
        query: searchQuery,
        maxNumber: maxNumber,
      },
    });
    spinner.stop();
  } catch (e) {
    spinner.fail();
    throw e;
  }

  const commits = res.search.nodes.map((pullRequestNode) => {
    // this should never happen since we are searching for merged PR (is:merged) in the first place
    // but typescript doesn't know about this
    if (pullRequestNode.mergeCommit == null) {
      throw new Error('Pull Request is not merged');
    }

    const committedDate = pullRequestNode.mergeCommit.committedDate;
    const sha = pullRequestNode.mergeCommit.oid;
    const pullNumber = pullRequestNode.number;
    const commitMessage = pullRequestNode.mergeCommit.message;
    const formattedMessage = getFormattedCommitMessage({
      message: commitMessage,
      sha,
      pullNumber,
    });

    const existingTargetPullRequests =
      getExistingTargetPullRequests(pullRequestNode);

    const targetBranchesFromLabels = getTargetBranchesFromLabels({
      sourceBranch: pullRequestNode.baseRefName,
      existingTargetPullRequests,
      branchLabelMapping: options.branchLabelMapping,
      labels: getPullRequestLabels(pullRequestNode),
    });

    const choice: Commit = {
      committedDate,
      sourceBranch,
      targetBranchesFromLabels,
      sha,
      formattedMessage,
      originalMessage: commitMessage,
      pullNumber,
      existingTargetPullRequests,
    };

    return choice;
  });

  // terminate if not commits were found
  if (isEmpty(commits)) {
    const errorText = options.all
      ? `There are no pull requests matching the filter "${prFilter}"`
      : `There are no commits by "${options.author}" matching the filter "${prFilter}". Try with \`--all\` for commits by all users or \`--author=<username>\` for commits from a specific user`;

    throw new HandledError(errorText);
  }

  return commits;
}

export interface PullRequestBySearchQueryResponse {
  search: {
    nodes: PullRequestNode[];
  };
}
