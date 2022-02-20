import gql from 'graphql-tag';
import {
  RemoteConfigHistory,
  RemoteConfigHistoryFragment,
} from '../../../remoteConfig';

export interface GithubConfigOptionsResponse {
  viewer: {
    login: string;
  };
  repository: {
    illegalBackportBranch: { id: string } | null;
    defaultBranchRef: {
      name: string;
      target: RemoteConfigHistory;
    };
  };
}

export const query = gql`
  query GithubConfigOptions($repoOwner: String!, $repoName: String!) {
    viewer {
      login
    }
    repository(owner: $repoOwner, name: $repoName) {
      # check to see if a branch named "backport" exists
      illegalBackportBranch: ref(qualifiedName: "refs/heads/backport") {
        id
      }
      defaultBranchRef {
        name
        target {
          ...RemoteConfigHistoryFragment
        }
      }
    }
  }

  ${RemoteConfigHistoryFragment}
`;
