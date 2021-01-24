export type RemoteConfig = {
  committedDate: string;
  file: { object: { text: string } };
};

type Ref = { name: string } | null;
type DefaultBranchRef = {
  name: string;
  target: {
    jsonConfigFile: { edges: ({ config: RemoteConfig } | undefined)[] };
  };
};

export type Repository = {
  ref: Ref;
  defaultBranchRef: DefaultBranchRef;
};

export interface GithubConfigOptionsResponse {
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
        ...JSONConfigFile
      }
    }
  }

  fragment JSONConfigFile on Commit {
    jsonConfigFile: history(first: 1, path: ".backportrc.json") {
      edges {
        config: node {
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
`;
