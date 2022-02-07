import { ConfigFileOptions } from '../../../../options/ConfigOptions';
import { withConfigMigrations } from '../../../../options/config/readConfigFile';
import { filterNil } from '../../../../utils/filterEmpty';
import { HandledError } from '../../../HandledError';
import {
  getLocalConfigFileCommitDate,
  isLocalConfigFileUntracked,
  isLocalConfigFileModified,
} from '../../../git';
import { logger } from '../../../logger';
import { apiRequestV4, GithubV4Exception } from '../apiRequestV4';
import { throwOnInvalidAccessToken } from '../throwOnInvalidAccessToken';
import { GithubConfigOptionsResponse, query, RemoteConfig } from './query';

// fetches the default source branch for the repo (normally "master")
// startup checks:
// - verify the access token
// - ensure no branch named "backport" exists

export async function getOptionsFromGithub(options: {
  accessToken: string;
  githubApiBaseUrlV4?: string;
  repoName: string;
  repoOwner: string;
  skipRemoteConfig?: boolean;
  cwd?: string;
}) {
  const { accessToken, githubApiBaseUrlV4, repoName, repoOwner } = options;

  let res: GithubConfigOptionsResponse;

  try {
    res = await apiRequestV4<GithubConfigOptionsResponse>({
      githubApiBaseUrlV4,
      accessToken,
      query,
      variables: { repoOwner, repoName },
    });
  } catch (e) {
    if (!(e instanceof GithubV4Exception)) {
      throw e;
    }

    const error = e as GithubV4Exception<GithubConfigOptionsResponse>;
    throwOnInvalidAccessToken({ error, repoName, repoOwner });
    res = swallowErrorIfConfigFileIsMissing(error);
  }

  // get the original repo (not the fork)
  const repo = res.repository.isFork ? res.repository.parent : res.repository;

  // it is not possible to have a branch named "backport"
  if (repo.ref?.name === 'backport') {
    throw new HandledError(
      'You must delete the branch "backport" to continue. See https://github.com/sqren/backport/issues/155 for details'
    );
  }

  const historicalRemoteConfigs = repo.defaultBranchRef.target.history.edges;
  const latestRemoteConfig = historicalRemoteConfigs[0]?.remoteConfig;
  const skipRemoteConfig = await getSkipRemoteConfigFile(
    options.cwd,
    options.skipRemoteConfig,
    latestRemoteConfig
  );

  return {
    authenticatedUsername: res.viewer.login,
    sourceBranch: repo.defaultBranchRef.name,
    ...(skipRemoteConfig ? {} : parseRemoteConfig(latestRemoteConfig)),
    historicalBranchLabelMappings: skipRemoteConfig
      ? []
      : getHistoricalBranchLabelMappings(historicalRemoteConfigs),
  };
}

async function getSkipRemoteConfigFile(
  cwd?: string,
  skipRemoteConfig?: boolean,
  remoteConfig?: RemoteConfig
) {
  if (skipRemoteConfig) {
    logger.info(
      'Skipping remote config: `--skip-remote-config` specified via config file or cli'
    );
    return true;
  }

  if (!remoteConfig) {
    logger.info("Skipping remote config: remote config doesn't exist");
    return true;
  }

  if (cwd) {
    const [isLocalConfigModified, isLocalConfigUntracked, localCommitDate] =
      await Promise.all([
        isLocalConfigFileModified({ cwd }),
        isLocalConfigFileUntracked({ cwd }),
        getLocalConfigFileCommitDate({ cwd }),
      ]);

    if (isLocalConfigUntracked) {
      logger.info('Skipping remote config: local config is new');
      return true;
    }

    if (isLocalConfigModified) {
      logger.info('Skipping remote config: local config is modified');
      return true;
    }

    if (
      localCommitDate &&
      localCommitDate > Date.parse(remoteConfig.committedDate)
    ) {
      logger.info(
        `Skipping remote config: local config is newer: ${new Date(
          localCommitDate
        ).toISOString()} > ${remoteConfig.committedDate}`
      );
      return true;
    }
  }

  return false;
}

function parseRemoteConfig(remoteConfig?: RemoteConfig) {
  if (!remoteConfig) {
    return;
  }

  try {
    logger.info('Using remote config');
    return withConfigMigrations(
      JSON.parse(remoteConfig.file.object.text)
    ) as ConfigFileOptions;
  } catch (e) {
    logger.info('Parsing remote config failed', e);
    return;
  }
}

function getHistoricalBranchLabelMappings(
  historicalRemoteConfigs: { remoteConfig: RemoteConfig }[]
) {
  return historicalRemoteConfigs
    .map((edge) => {
      try {
        const remoteConfig = JSON.parse(
          edge.remoteConfig.file.object.text
        ) as ConfigFileOptions;

        if (!remoteConfig.branchLabelMapping) {
          return;
        }

        return {
          branchLabelMapping: remoteConfig.branchLabelMapping,
          committedDate: edge.remoteConfig.committedDate,
        };
      } catch (e) {
        logger.info('Could not get historical remote config', e);
        return;
      }
    })
    .filter(filterNil);
}
function swallowErrorIfConfigFileIsMissing<T>(error: GithubV4Exception<T>) {
  const { data, errors } = error.axiosResponse.data;

  const wasMissingConfigError = errors?.some(
    (error) =>
      error.type === 'NOT_FOUND' &&
      error.path.join('.') ===
        'repository.defaultBranchRef.target.history.edges.0.remoteConfig.file'
  );

  // swallow error if it's just the config file that's missing
  if (wasMissingConfigError && data != null) {
    return data;
  }

  // Throw unexpected error
  throw error;
}
