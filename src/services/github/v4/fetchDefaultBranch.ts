import { ValidConfigOptions } from '../../../options/options';
import { apiRequestV4 } from './apiRequestV4';

export async function fetchDefaultBranch(options: ValidConfigOptions) {
  const { accessToken, githubApiBaseUrlV4, repoName, repoOwner } = options;
  const query = /* GraphQL */ `
    query DefaultBranch($repoOwner: String!, $repoName: String!) {
      repo: repository(owner: $repoOwner, name: $repoName) {
        defaultBranchRef {
          name
        }
      }
    }
  `;

  const res = await apiRequestV4<DataResponse>({
    githubApiBaseUrlV4,
    accessToken,
    query,
    variables: { repoOwner, repoName },
  });

  return res.repo.defaultBranchRef.name;
}

export interface DataResponse {
  repo: {
    defaultBranchRef: {
      name: string;
    };
  };
}
