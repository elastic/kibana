import { ValidConfigOptions } from '../../../options/options';
import { fetchPullRequestId } from './FetchPullRequestId';
import { apiRequestV4 } from './apiRequestV4';

export interface PullRequestAutoMergeResponse {
  disablePullRequestAutoMerge: { pullRequest?: { number: number } };
}

export async function disablePullRequestAutoMerge(
  options: ValidConfigOptions,
  pullNumber: number
) {
  const { accessToken, githubApiBaseUrlV4 } = options;
  const pullRequestId = await fetchPullRequestId(options, pullNumber);

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
