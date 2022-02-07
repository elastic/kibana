import { ValidConfigOptions } from '../../../options/options';
import { apiRequestV4 } from './apiRequestV4';

interface Response {
  repository: { pullRequest?: { autoMergeRequest?: { mergeMethod: string } } };
}

export async function fetchPullRequestAutoMergeMethod(
  options: ValidConfigOptions,
  pullNumber: number
) {
  const { accessToken, githubApiBaseUrlV4, repoName, repoOwner } = options;

  const query = /* GraphQL */ `
    query PullRequestAutoMergeMethod(
      $repoOwner: String!
      $repoName: String!
      $pullNumber: Int!
    ) {
      repository(owner: $repoOwner, name: $repoName) {
        pullRequest(number: $pullNumber) {
          autoMergeRequest {
            enabledAt
            mergeMethod
          }
        }
      }
    }
  `;

  const res = await apiRequestV4<Response>({
    githubApiBaseUrlV4,
    accessToken,
    query,
    variables: {
      repoOwner,
      repoName,
      pullNumber,
    },
  });

  return res.repository.pullRequest?.autoMergeRequest?.mergeMethod;
}
