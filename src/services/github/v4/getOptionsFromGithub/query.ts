export type RemoteConfig = {
  committedDate: string;
  file: { object: { text: string } };
};

export interface GithubConfigOptionsResponse {
  viewer: {
    login: string;
  };
  repository: {
    illegalBackportBranch: { id: string } | null;
    defaultBranchRef: {
      name: string;
      target: {
        history: { edges: Array<{ remoteConfig: RemoteConfig }> };
      };
    };
  };
}

export const query = /* GraphQL */ `
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
          ... on Commit {
            history(first: 20, path: ".backportrc.json") {
              edges {
                remoteConfig: node {
                  committedDate
                  file(path: ".backportrc.json") {
                    ... on TreeEntry {
                      object {
                        ... on Blob {
                          text
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;
