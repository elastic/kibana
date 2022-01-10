import { AxiosError } from 'axios';
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
import {
  apiRequestV4,
  handleGithubV4Error,
  GithubV4Response,
} from '../apiRequestV4';
import { throwOnInvalidAccessToken } from '../throwOnInvalidAccessToken';
import { GithubConfigOptionsResponse, query, RemoteConfig } from './query';

// fetches the default source branch for the repo (normally "master")
// startup checks:
// - verify the access token
// - ensure no branch named "backport" exists

export type OptionsFromGithub = Awaited<
  ReturnType<typeof getOptionsFromGithub>
>;
export async function getOptionsFromGithub(options: {
  accessToken: string;
  githubApiBaseUrlV4?: string;
  repoName: string;
  repoOwner: string;
  skipRemoteConfig?: boolean;
}) {
  const { accessToken, githubApiBaseUrlV4, repoName, repoOwner } = options;

  let res: GithubConfigOptionsResponse;

  try {
    res = await apiRequestV4<GithubConfigOptionsResponse>({
      githubApiBaseUrlV4,
      accessToken,
      query,
      variables: { repoOwner, repoName },
      handleError: false,
    });
  } catch (e) {
    const error = e as AxiosError<
      GithubV4Response<GithubConfigOptionsResponse | null>
    >;

    throwOnInvalidAccessToken({
      error,
      repoName,
      repoOwner,
    });

    res = handleMissingConfigFile(error);
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

  const [isLocalConfigModified, isLocalConfigUntracked, localCommitDate] =
    await Promise.all([
      isLocalConfigFileModified(),
      isLocalConfigFileUntracked(),
      getLocalConfigFileCommitDate(),
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
function handleMissingConfigFile(
  error: AxiosError<GithubV4Response<GithubConfigOptionsResponse | null>>
) {
  const wasMissingConfigError = error.response?.data.errors?.some(
    (error) =>
      error.type === 'NOT_FOUND' &&
      error.path.join('.') ===
        'repository.defaultBranchRef.target.history.edges.0.remoteConfig.file'
  );

  // Throw unexpected error
  if (!wasMissingConfigError || !error.response?.data.data) {
    throw handleGithubV4Error(error);
  }

  return error.response.data.data;
}
