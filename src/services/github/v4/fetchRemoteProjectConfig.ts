import gql from 'graphql-tag';
import { ConfigFileOptions } from '../../../entrypoint.module';
import {
  parseRemoteConfig,
  RemoteConfigHistory,
  RemoteConfigHistoryFragment,
} from '../../remoteConfig';
import { apiRequestV4 } from './apiRequestV4';

export async function fetchRemoteProjectConfig(options: {
  accessToken: string;
  githubApiBaseUrlV4?: string;
  repoName: string;
  repoOwner: string;
  sourceBranch: string;
}): Promise<ConfigFileOptions | undefined> {
  const { accessToken, githubApiBaseUrlV4, repoName, repoOwner, sourceBranch } =
    options;

  const query = gql`
    query ProjectConfig(
      $repoOwner: String!
      $repoName: String!
      $sourceBranch: String!
    ) {
      repository(owner: $repoOwner, name: $repoName) {
        ref(qualifiedName: $sourceBranch) {
          target {
            ...RemoteConfigHistory
          }
        }
      }
    }

    ${RemoteConfigHistoryFragment}
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

    const remoteConfig =
      res.repository.ref.target.remoteConfigHistory.edges?.[0].remoteConfig;

    if (remoteConfig) {
      return parseRemoteConfig(remoteConfig);
    }
  } catch (e) {
    throw new Error('Project config does not exist');
  }
}

interface GithubProjectConfig {
  repository: {
    ref: {
      target: RemoteConfigHistory;
    };
  };
}
