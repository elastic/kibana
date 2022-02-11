import gql from 'graphql-tag';
import { ConfigFileOptions } from '../entrypoint.module';
import { withConfigMigrations } from '../options/config/readConfigFile';
import { logger } from './logger';

export const RemoteConfigHistoryFragment = gql`
  fragment RemoteConfigHistory on Commit {
    remoteConfigHistory: history(first: 1, path: ".backportrc.json") {
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
`;

export interface RemoteConfig {
  committedDate: string;
  file: {
    object: { text: string };
  };
}

export interface RemoteConfigHistory {
  remoteConfigHistory: {
    edges: Array<{
      remoteConfig: RemoteConfig;
    }> | null;
  };
}

export function parseRemoteConfig(remoteConfig: RemoteConfig) {
  try {
    return withConfigMigrations(
      JSON.parse(remoteConfig.file.object.text)
    ) as ConfigFileOptions;
  } catch (e) {
    logger.info('Parsing remote config failed', e);
    return;
  }
}
