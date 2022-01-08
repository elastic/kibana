import { ValidConfigOptions } from '../../../../options/options';
import { HandledError } from '../../../HandledError';
import {
  Commit,
  SourceCommitWithTargetPullRequest,
  sourceCommitWithTargetPullRequestFragment,
  parseSourceCommit,
} from '../../../sourceCommit/parseSourceCommit';
import { apiRequestV4 } from '../apiRequestV4';

export async function fetchCommitByPullNumber(options: {
  accessToken: string;
  branchLabelMapping?: ValidConfigOptions['branchLabelMapping'];
  githubApiBaseUrlV4?: string;
  historicalBranchLabelMappings: ValidConfigOptions['historicalBranchLabelMappings'];
  pullNumber: number;
  repoName: string;
  repoOwner: string;
  sourceBranch: string;
}): Promise<Commit> {
  const {
    accessToken,
    githubApiBaseUrlV4 = 'https://api.github.com/graphql',
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
          mergeCommit {
            ...SourceCommitWithTargetPullRequest
          }
        }
      }
    }

    ${sourceCommitWithTargetPullRequestFragment.source}
  `;

  const res = await apiRequestV4<CommitByPullNumberResponse>({
    githubApiBaseUrlV4,
    accessToken,
    query,
    variables: {
      repoOwner,
      repoName,
      pullNumber,
    },
  });

  const pullRequestNode = res.repository.pullRequest;
  if (!pullRequestNode) {
    throw new HandledError(`The PR #${pullNumber} does not exist`);
  }

  const sourceCommit = pullRequestNode.mergeCommit;
  if (sourceCommit === null) {
    throw new HandledError(`The PR #${pullNumber} is not merged`);
  }
  return parseSourceCommit({ options, sourceCommit });
}

interface CommitByPullNumberResponse {
  repository: {
    pullRequest: {
      mergeCommit: SourceCommitWithTargetPullRequest | null;
    } | null;
  };
}
