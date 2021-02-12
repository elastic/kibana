import { ValidConfigOptions } from '../../../options/options';
import { apiRequestV4 } from './apiRequestV4';

export interface PullRequestResponse {
  repository: {
    pullRequest: { id: string };
  };
}

export interface PullRequestAutoMergeResponse {
  disablePullRequestAutoMerge: { pullRequest?: { number: number } };
}

export async function disablePullRequestAutoMerge(options: ValidConfigOptions) {
  const {
    accessToken,
    githubApiBaseUrlV4,
    pullNumber,
    repoName,
    repoOwner,
  } = options;

  if (!pullNumber) {
    return;
  }

  const prQuery = /* GraphQL */ `
    query GetRepoId(
      $repoOwner: String!
      $repoName: String!
      $pullNumber: Int!
    ) {
      repository(owner: $repoOwner, name: $repoName) {
        pullRequest(number: $pullNumber) {
          id
        }
      }
    }
  `;

  const prResponse = await apiRequestV4<PullRequestResponse>({
    githubApiBaseUrlV4,
    accessToken,
    query: prQuery,
    variables: {
      repoOwner,
      repoName,
      pullNumber,
    },
  });

  const pullRequestId = prResponse.repository.pullRequest.id;

  const query = /* GraphQL */ `
    mutation DisablePullRequestAutoMerge($pullRequestId: ID!) {
      disablePullRequestAutoMerge(input: { pullRequestId: $pullRequestId }) {
        pullRequest {
          number
        }
      }
    }
  `;

  const res = await apiRequestV4<PullRequestAutoMergeResponse>({
    githubApiBaseUrlV4,
    accessToken,
    query,
    variables: {
      pullRequestId,
    },
  });

  return res.disablePullRequestAutoMerge.pullRequest?.number;
}
