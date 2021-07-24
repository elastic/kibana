import { AxiosError } from 'axios';
import ora from 'ora';
import { ConfigOptions } from '../../../../options/ConfigOptions';
import { OptionsFromCliArgs } from '../../../../options/cliArgs';
import { OptionsFromConfigFiles } from '../../../../options/config/config';
import { getRequiredOptions } from '../../../../options/parseRequiredOptions';
import { PromiseReturnType } from '../../../../types/PromiseReturnType';
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

export type OptionsFromGithub = PromiseReturnType<typeof getOptionsFromGithub>;
export async function getOptionsFromGithub(
  optionsFromConfigFiles: OptionsFromConfigFiles,
  optionsFromCliArgs: OptionsFromCliArgs
) {
  const options = {
    ...optionsFromConfigFiles,
    ...optionsFromCliArgs,
  } as OptionsFromCliArgs & OptionsFromConfigFiles;

  const { githubApiBaseUrlV4 } = options;
  const { accessToken, repoName, repoOwner } = getRequiredOptions(options);

  let res: GithubConfigOptionsResponse;
  const spinner = ora().start('Initializing...');
  try {
    res = await apiRequestV4<GithubConfigOptionsResponse>({
      githubApiBaseUrlV4,
      accessToken,
      query,
      variables: { repoOwner, repoName },
      handleError: false,
    });
    spinner.stop();
  } catch (e) {
    spinner.stop();
    const error = e as AxiosError<
      GithubV4Response<GithubConfigOptionsResponse | null>
    >;

    throwOnInvalidAccessToken({
      error,
      repoName,
      repoOwner,
    });

    const configFileNotFound = error.response?.data.errors?.some(
      (error) =>
        error.type === 'NOT_FOUND' &&
        error.path.join('.') ===
          'repository.defaultBranchRef.target.jsonConfigFile.edges.0.config.file'
    );

    if (configFileNotFound && error.response?.data.data) {
      // swallow error if caused by missing config file on Github
      res = error.response.data.data;
    } else {
      // throw generic Github error
      throw handleGithubV4Error(error);
    }
  }

  // get the original repo (not the fork)
  const repo = res.repository.isFork ? res.repository.parent : res.repository;

  // it is not possible to have a branch named "backport"
  if (repo.ref?.name === 'backport') {
    throw new HandledError(
      'You must delete the branch "backport" to continue. See https://github.com/sqren/backport/issues/155 for details'
    );
  }

  const remoteConfig =
    repo.defaultBranchRef.target.jsonConfigFile.edges[0]?.config;
  const remoteConfigFile = await getRemoteConfigFile(options, remoteConfig);
  const defaultBranch = repo.defaultBranchRef.name;

  // if no sourceBranch is given, use the `defaultBranch` (normally "master")
  const sourceBranch = options.sourceBranch
    ? options.sourceBranch
    : defaultBranch;

  return {
    sourceBranch,
    ...remoteConfigFile,
  };
}

async function getRemoteConfigFile(
  options: OptionsFromCliArgs,
  remoteConfig?: RemoteConfig
) {
  if (options.forceLocalConfig) {
    logger.info(
      'Skipping remote config: `--force-local-config` specified via config file or cli'
    );
    return;
  }

  if (!remoteConfig) {
    logger.info("Skipping remote config: remote config doesn't exist");
    return;
  }

  const [isLocalConfigModified, isLocalConfigUntracked, localCommitDate] =
    await Promise.all([
      isLocalConfigFileModified(),
      isLocalConfigFileUntracked(),
      getLocalConfigFileCommitDate(),
    ]);

  if (isLocalConfigUntracked) {
    logger.info('Skipping remote config: local config is new');
    return;
  }

  if (isLocalConfigModified) {
    logger.info('Skipping remote config: local config is modified');
    return;
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
    return;
  }

  try {
    logger.info('Using remote config');
    return JSON.parse(remoteConfig.file.object.text) as ConfigOptions;
  } catch (e) {
    logger.info('Parsing remote config failed', e);
    return;
  }
}
