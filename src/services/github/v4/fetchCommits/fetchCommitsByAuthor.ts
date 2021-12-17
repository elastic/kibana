import { isEmpty, uniqBy, orderBy } from 'lodash';
import { ValidConfigOptions } from '../../../../options/options';
import { filterNil } from '../../../../utils/filterEmpty';
import { HandledError } from '../../../HandledError';
import {
  Commit,
  SourceCommitWithTargetPullRequest,
  sourceCommitWithTargetPullRequestFragment,
  parseSourceCommit,
} from '../../../sourceCommit';
import { apiRequestV4 } from '../apiRequestV4';
import { fetchAuthorId } from '../fetchAuthorId';

function fetchByCommitPath({
  options,
  authorId,
  commitPath,
}: {
  options: ValidConfigOptions;
  authorId: string | null;
  commitPath: string | null;
}) {
  const {
    accessToken,
    githubApiBaseUrlV4,
    maxNumber,
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
      $commitPath: String
    ) {
      repository(owner: $repoOwner, name: $repoName) {
        ref(qualifiedName: $sourceBranch) {
          target {
            ... on Commit {
              history(
                first: $maxNumber
                author: { id: $authorId }
                path: $commitPath
              ) {
                edges {
                  node {
                    ...${sourceCommitWithTargetPullRequestFragment.name}
                  }
                }
              }
            }
          }
        }
      }
    }

    ${sourceCommitWithTargetPullRequestFragment.source}
  `;

  return apiRequestV4<CommitByAuthorResponse>({
    githubApiBaseUrlV4,
    accessToken,
    query,
    variables: {
      repoOwner,
      repoName,
      sourceBranch,
      maxNumber,
      authorId,
      commitPath,
    },
  });
}

export async function fetchCommitsByAuthor(
  options: ValidConfigOptions
): Promise<Commit[]> {
  const { sourceBranch, commitPaths } = options;

  const authorId = await fetchAuthorId(options);
  const responses = await Promise.all(
    isEmpty(commitPaths)
      ? [fetchByCommitPath({ options, authorId, commitPath: null })]
      : commitPaths.map((commitPath) =>
          fetchByCommitPath({ options, authorId, commitPath })
        )
  );

  // we only need to check if the first item is `null` (if the first is `null` they all are)
  if (responses[0].repository.ref === null) {
    throw new HandledError(
      `The upstream branch "${sourceBranch}" does not exist. Try specifying a different branch with "--source-branch <your-branch>"`
    );
  }

  const commits = responses
    .flatMap((res) => {
      return res.repository.ref?.target.history.edges.map((edge) => {
        const sourceCommit = edge.node;
        return parseSourceCommit({ options, sourceCommit });
      });
    })
    .filter(filterNil);

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
        history: {
          edges: Array<{ node: SourceCommitWithTargetPullRequest }>;
        };
      };
    } | null;
  };
}
