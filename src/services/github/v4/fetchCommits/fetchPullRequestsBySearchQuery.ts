import gql from 'graphql-tag';
import { isEmpty } from 'lodash';
import { filterUnmergedCommits } from '../../../../utils/filterUnmergedCommits';
import { HandledError } from '../../../HandledError';
import { swallowMissingConfigFileException } from '../../../remoteConfig';
import {
  Commit,
  SourceCommitWithTargetPullRequest,
  SourceCommitWithTargetPullRequestFragment,
  parseSourceCommit,
} from '../../../sourceCommit/parseSourceCommit';
import { apiRequestV4 } from '../apiRequestV4';

export async function fetchPullRequestsBySearchQuery(options: {
  accessToken: string;
  author: string | null;
  githubApiBaseUrlV4?: string;
  maxNumber?: number;
  onlyMissing?: boolean;
  prFilter: string;
  repoName: string;
  repoOwner: string;
  sourceBranch: string;
}): Promise<Commit[]> {
  const {
    accessToken,
    githubApiBaseUrlV4 = 'https://api.github.com/graphql',
    maxNumber = 10,
    prFilter,
    repoName,
    repoOwner,
    sourceBranch,
    author,
  } = options;

  const query = gql`
    query PullRequestBySearchQuery($query: String!, $maxNumber: Int!) {
      search(query: $query, type: ISSUE, first: $maxNumber) {
        nodes {
          ... on PullRequest {
            mergeCommit {
              ...SourceCommitWithTargetPullRequestFragment
            }
          }
        }
      }
    }

    ${SourceCommitWithTargetPullRequestFragment}
  `;

  const authorFilter = options.author ? ` author:${options.author}` : '';
  const sourceBranchFilter = prFilter.includes('base:')
    ? ''
    : ` base:${sourceBranch}`;
  const searchQuery = `type:pr is:merged sort:updated-desc repo:${repoOwner}/${repoName}${authorFilter}${sourceBranchFilter} ${prFilter} `;

  const variables = {
    query: searchQuery,
    maxNumber,
  };

  let res;
  try {
    res = await apiRequestV4<ResponseData>({
      githubApiBaseUrlV4,
      accessToken,
      query,
      variables,
    });
  } catch (e) {
    res = swallowMissingConfigFileException<ResponseData>(e);
  }

  const commits = res.search.nodes.map((pullRequestNode) => {
    const sourceCommit = pullRequestNode.mergeCommit;
    return parseSourceCommit({ options, sourceCommit });
  });

  // terminate if not commits were found
  if (isEmpty(commits)) {
    const errorText = author
      ? `No commits found for query:\n    ${searchQuery}\n\nUse \`--all\` to see commits by all users or \`--author=<username>\` for commits from a specific user`
      : `No commits found for query:\n    ${searchQuery}`;

    throw new HandledError(errorText);
  }

  if (options.onlyMissing) {
    return commits.filter(filterUnmergedCommits);
  }

  return commits;
}

interface ResponseData {
  search: {
    nodes: Array<{
      mergeCommit: SourceCommitWithTargetPullRequest;
    }>;
  };
}
