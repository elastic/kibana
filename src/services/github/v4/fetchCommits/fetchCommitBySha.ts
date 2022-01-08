import { ValidConfigOptions } from '../../../../options/options';
import { HandledError } from '../../../HandledError';
import {
  Commit,
  SourceCommitWithTargetPullRequest,
  sourceCommitWithTargetPullRequestFragment,
  parseSourceCommit,
} from '../../../sourceCommit/parseSourceCommit';
import { apiRequestV4 } from '../apiRequestV4';

export async function fetchCommitBySha(options: {
  accessToken: string;
  branchLabelMapping?: ValidConfigOptions['branchLabelMapping'];
  githubApiBaseUrlV4?: string;
  historicalBranchLabelMappings: ValidConfigOptions['historicalBranchLabelMappings'];
  repoName: string;
  repoOwner: string;
  sha: string;
  sourceBranch: string;
}): Promise<Commit> {
  const {
    accessToken,
    githubApiBaseUrlV4 = 'https://api.github.com/graphql',
    repoName,
    repoOwner,
    sha,
    sourceBranch,
  } = options;

  const query = /* GraphQL */ `
    query CommitsBySha($repoOwner: String!, $repoName: String!, $oid: String!) {
      repository(owner: $repoOwner, name: $repoName) {
        object(expression: $oid) {
          ...SourceCommitWithTargetPullRequest
        }
      }
    }

    ${sourceCommitWithTargetPullRequestFragment.source}
  `;

  const res = await apiRequestV4<CommitsByShaResponse>({
    githubApiBaseUrlV4,
    accessToken,
    query,
    variables: {
      repoOwner,
      repoName,
      oid: sha,
    },
  });

  const sourceCommit = res.repository.object;
  if (!sourceCommit) {
    throw new HandledError(
      `No commit found on branch "${sourceBranch}" with sha "${sha}"`
    );
  }

  return parseSourceCommit({ options, sourceCommit });
}

interface CommitsByShaResponse {
  repository: {
    object: SourceCommitWithTargetPullRequest | null;
  };
}
