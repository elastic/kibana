import { ValidConfigOptions } from '../../../options/options';
import { apiRequestV4 } from './apiRequestV4';

export interface PullRequestResponse {
  repository: {
    pullRequest: { id: string };
  };
}

export interface PullRequestAutoMergeResponse {
  enablePullRequestAutoMerge: { pullRequest?: { number: number } };
}

export async function enablePullRequestAutoMerge(options: ValidConfigOptions) {
  const {
    accessToken,
    githubApiBaseUrlV4,
    pullNumber,
    repoName,
    repoOwner,
    autoMergeMethod,
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
    mutation EnablePullRequestAutoMerge(
      $pullRequestId: ID!
      $mergeMethod: PullRequestMergeMethod!
    ) {
      enablePullRequestAutoMerge(
        input: { pullRequestId: $pullRequestId, mergeMethod: $mergeMethod }
      ) {
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
      mergeMethod: autoMergeMethod.toUpperCase(),
    },
  });

  return res.enablePullRequestAutoMerge.pullRequest?.number;
}
