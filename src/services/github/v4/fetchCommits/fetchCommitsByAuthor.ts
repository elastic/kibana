import { isEmpty, uniqBy, orderBy } from 'lodash';
import ora from 'ora';
import { ValidConfigOptions } from '../../../../options/options';
import { HandledError } from '../../../HandledError';
import {
  Commit,
  SourceCommitWithTargetPullRequest,
  sourceCommitWithTargetPullRequestFragment,
  parseSourceCommit,
} from '../../../sourceCommit';
import { apiRequestV4 } from '../apiRequestV4';
import { fetchAuthorId } from '../fetchAuthorId';

function getCommitHistoryFragment(commitPath: string | null, index = 0) {
  return /* GraphQL */ `
  _${index}: history(
    first: $maxNumber
    author: { id: $authorId }
    ${commitPath ? `path: "${commitPath}"` : ''}
  ) {
    edges {
      node {
       ...${sourceCommitWithTargetPullRequestFragment.name}
      }
    }
  }`;
}

export async function fetchCommitsByAuthor(
  options: ValidConfigOptions
): Promise<Commit[]> {
  const {
    accessToken,
    commitPaths,
    githubApiBaseUrlV4,
    maxNumber,
    repoName,
    repoOwner,
    sourceBranch,
  } = options;

  const commitHistoryFragment =
    commitPaths.length > 0
      ? commitPaths.map(getCommitHistoryFragment).join('\n')
      : getCommitHistoryFragment(null);

  const query = /* GraphQL */ `
    query CommitsByAuthor(
      $repoOwner: String!
      $repoName: String!
      $maxNumber: Int!
      $sourceBranch: String!
      $authorId: ID
    ) {
      repository(owner: $repoOwner, name: $repoName) {
        ref(qualifiedName: $sourceBranch) {
          target {
            ... on Commit {
              ${commitHistoryFragment}
            }
          }
        }
      }
    }

    ${sourceCommitWithTargetPullRequestFragment.source}
  `;

  const spinner = ora(
    `Loading commits from branch "${sourceBranch}"...`
  ).start();
  let res: CommitByAuthorResponse;
  try {
    const authorId = await fetchAuthorId(options);
    res = await apiRequestV4<CommitByAuthorResponse>({
      githubApiBaseUrlV4,
      accessToken,
      query,
      variables: {
        repoOwner,
        repoName,
        sourceBranch,
        maxNumber,
        authorId,
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

  const commits = Object.values(res.repository.ref.target).flatMap(
    (historyResponse) => {
      return historyResponse.edges.map((edge) => {
        const sourceCommit = edge.node;
        return parseSourceCommit({ options, sourceCommit });
      });
    }
  );

  // terminate if not commits were found
  if (isEmpty(commits)) {
    const pathText =
      options.commitPaths.length > 0
        ? ` touching files in path: "${options.commitPaths}"`
        : '';

    const errorText = options.all
      ? `There are no commits in this repository${pathText}`
      : `There are no commits by "${options.author}" in this repository${pathText}. Try with \`--all\` for commits by all users or \`--author=<username>\` for commits from a specific user`;

    throw new HandledError(errorText);
  }

  const commitsUnique = uniqBy(commits, 'sha');
  const commitsSorted = orderBy(commitsUnique, 'committedDate', 'desc');
  return commitsSorted;
}

export interface CommitByAuthorResponse {
  repository: {
    ref: {
      target: {
        [commitPath: string]: {
          edges: Array<{ node: SourceCommitWithTargetPullRequest }>;
        };
      };
    } | null;
  };
}
