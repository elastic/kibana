import { BackportOptions } from '../../../options/options';
import { getRemoteName } from '../../git';
import { apiRequestV4 } from './apiRequestV4';

export async function fetchExistingPullRequest({
  options,
  targetBranch,
  backportBranch,
}: {
  options: BackportOptions;
  targetBranch: string;
  backportBranch: string;
}) {
  const { githubApiBaseUrlV4, repoName, accessToken } = options;
  const query = /* GraphQL */ `
    query ExistingPullRequest(
      $repoOwner: String!
      $repoName: String!
      $targetBranch: String!
      $backportBranch: String!
    ) {
      repository(owner: $repoOwner, name: $repoName) {
        name
        ref(qualifiedName: $backportBranch) {
          name
          associatedPullRequests(
            first: 1
            states: OPEN
            baseRefName: $targetBranch
            headRefName: $backportBranch
          ) {
            edges {
              node {
                number
                url
              }
            }
          }
        }
      }
    }
  `;

  const res = await apiRequestV4<DataResponse>({
    githubApiBaseUrlV4,
    accessToken,
    query,
    variables: {
      repoOwner: getRemoteName(options),
      repoName,
      targetBranch,
      backportBranch,
    },
  });

  const existingPullRequest =
    res.repository.ref?.associatedPullRequests.edges[0];

  if (!existingPullRequest) {
    return;
  }

  return {
    html_url: existingPullRequest.node.url,
    number: existingPullRequest.node.number,
  };
}

interface DataResponse {
  repository: {
    name: string;
    ref: {
      name: string;
      associatedPullRequests: {
        edges: {
          node: {
            number: number;
            url: string;
          };
        }[];
      };
    } | null;
  };
}
