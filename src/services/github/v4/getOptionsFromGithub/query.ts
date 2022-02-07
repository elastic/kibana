export type RemoteConfig = {
  committedDate: string;
  file: { object: { text: string } };
};

type Repository = {
  ref: { name: string } | null;
  defaultBranchRef: {
    name: string;
    target: {
      history: { edges: Array<{ remoteConfig: RemoteConfig }> };
    };
  };
};

export interface GithubConfigOptionsResponse {
  viewer: {
    login: string;
  };
  repository:
    | {
        isFork: true;
        defaultBranchRef: null;
        parent: Repository;
      }
    | ({
        isFork: false;
        parent: null;
      } & Repository);
}

export const query = /* GraphQL */ `
  query GithubConfigOptions($repoOwner: String!, $repoName: String!) {
    viewer {
      login
    }
    repository(owner: $repoOwner, name: $repoName) {
      isFork
      ...Repo
      parent {
        ...Repo
      }
    }
  }

  fragment Repo on Repository {
    # check to see if a branch named "backport" exists
    ref(qualifiedName: "refs/heads/backport") {
      name
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
`;
