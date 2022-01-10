import { ConfigFileOptions } from '../../../entrypoint.module';
import { withConfigMigrations } from '../../../options/config/readConfigFile';
import { apiRequestV4 } from './apiRequestV4';

export async function fetchRemoteProjectConfig(options: {
  accessToken: string;
  githubApiBaseUrlV4?: string;
  repoName: string;
  repoOwner: string;
  sourceBranch: string;
}): Promise<ConfigFileOptions> {
  const { accessToken, githubApiBaseUrlV4, repoName, repoOwner, sourceBranch } =
    options;

  const query = /* GraphQL */ `
    query ProjectConfig(
      $repoOwner: String!
      $repoName: String!
      $sourceBranch: String!
    ) {
      repository(owner: $repoOwner, name: $repoName) {
        ref(qualifiedName: $sourceBranch) {
          target {
            ... on Commit {
              history(first: 1, path: ".backportrc.json") {
                edges {
                  remoteConfig: node {
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

  try {
    const res = await apiRequestV4<GithubProjectConfig>({
      githubApiBaseUrlV4,
      accessToken,
      query,
      variables: {
        repoOwner,
        repoName,
        sourceBranch,
      },
    });

    return withConfigMigrations(
      JSON.parse(
        res.repository.ref.target.history.edges[0].remoteConfig.file.object.text
      )
    ) as ConfigFileOptions;
  } catch (e) {
    throw new Error('Project config does not exist');
  }
}

interface GithubProjectConfig {
  repository: {
    ref: {
      target: {
        history: {
          edges: Array<{
            remoteConfig: {
              file: {
                object: {
                  text: string;
                };
              };
            };
          }>;
        };
      };
    };
  };
}
