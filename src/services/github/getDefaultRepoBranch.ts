import { gqlRequest } from './gqlRequest';
import { validateRequiredOptions } from '../../options/options';

export interface DataResponse {
  repository: {
    defaultBranchRef: {
      name: string;
    };
  };
}

export async function getDefaultRepoBranch({
  accessToken,
  apiHostname,
  repoName,
  repoOwner
}: ReturnType<typeof validateRequiredOptions>) {
  const query = /* GraphQL */ `
    query getDefaultBranch($repoOwner: String!, $repoName: String!) {
      repository(owner: $repoOwner, name: $repoName) {
        defaultBranchRef {
          name
        }
      }
    }
  `;

  const res = await gqlRequest<DataResponse>({
    apiHostname,
    accessToken,
    query,
    variables: {
      repoOwner,
      repoName
    }
  });

  return res.repository.defaultBranchRef.name;
}
