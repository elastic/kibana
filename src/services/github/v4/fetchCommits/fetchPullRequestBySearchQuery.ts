import { isEmpty } from 'lodash';
import { ValidConfigOptions } from '../../../../options/options';
import { HandledError } from '../../../HandledError';
import {
  Commit,
  SourceCommitWithTargetPullRequest,
  sourceCommitWithTargetPullRequestFragment,
  parseSourceCommit,
} from '../../../sourceCommit';
import { apiRequestV4 } from '../apiRequestV4';

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
            mergeCommit {
              ...${sourceCommitWithTargetPullRequestFragment.name}
            }
          }
        }
      }
    }

    ${sourceCommitWithTargetPullRequestFragment.source}
  `;

  const authorFilter = all ? '' : `author:${author}`;
  const searchQuery = `type:pr is:merged sort:updated-desc repo:${repoOwner}/${repoName} ${authorFilter} ${prFilter} base:${sourceBranch}`;
  const res = await apiRequestV4<PullRequestBySearchQueryResponse>({
    githubApiBaseUrlV4,
    accessToken,
    query,
    variables: {
      query: searchQuery,
      maxNumber: maxNumber,
    },
  });

  const commits = res.search.nodes.map((pullRequestNode) => {
    const sourceCommit = pullRequestNode.mergeCommit;
    return parseSourceCommit({ options, sourceCommit });
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
    nodes: Array<{
      mergeCommit: SourceCommitWithTargetPullRequest;
    }>;
  };
}
