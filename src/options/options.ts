import { isEmpty } from 'lodash';
import { HandledError } from '../services/HandledError';
import { getGlobalConfigPath } from '../services/env';
import { getOptionsFromGithub } from '../services/github/v4/getOptionsFromGithub/getOptionsFromGithub';
import { updateLogger } from './../services/logger';
import { ConfigFileOptions, TargetBranchChoiceOrString } from './ConfigOptions';
import { getOptionsFromCliArgs, OptionsFromCliArgs } from './cliArgs';
import {
  getOptionsFromConfigFiles,
  OptionsFromConfigFiles,
} from './config/config';

const PROJECT_CONFIG_DOCS_LINK =
  'https://github.com/sqren/backport/blob/main/docs/configuration.md#project-config-backportrcjson';

const GLOBAL_CONFIG_DOCS_LINK =
  'https://github.com/sqren/backport/blob/main/docs/configuration.md#global-config-backportconfigjson';

export type ValidConfigOptions = Readonly<
  Awaited<ReturnType<typeof getOptions>>
>;

export const defaultConfigOptions = {
  assignees: [] as Array<string>,
  autoAssign: false,
  autoMerge: false,
  autoMergeMethod: 'merge',
  backportBinary: 'backport',
  cherrypickRef: true,
  ci: false,
  commitPaths: [] as Array<string>,
  dateSince: null,
  dateUntil: null,
  details: false,
  fork: true,
  maxNumber: 10,
  multipleBranches: true,
  multipleCommits: false,
  noVerify: true,
  publishStatusComment: true,
  resetAuthor: false,
  reviewers: [] as Array<string>,
  sourcePRLabels: [] as string[],
  targetBranchChoices: [] as TargetBranchChoiceOrString[],
  targetBranches: [] as string[],
  targetPRLabels: [] as string[],
  verbose: false,
};

export async function getOptions(
  processArgs: string[],
  optionsFromModule: ConfigFileOptions
) {
  const optionsFromCliArgs = getOptionsFromCliArgs(processArgs);
  const optionsFromConfigFiles = await getOptionsFromConfigFiles({
    optionsFromCliArgs,
    optionsFromModule,
    defaultConfigOptions,
  });

  // combined options from cli and config files
  const combined = getCombinedOptions({
    optionsFromConfigFiles,
    optionsFromCliArgs,
  });

  // update logger
  updateLogger(combined);

  // required
  const accessToken = requireAccessToken(combined);
  const repoName = requireRepoName(combined);
  const repoOwner = requireRepoOwner(combined);

  const optionsFromGithub = await getOptionsFromGithub({
    ...combined,

    // required props
    accessToken,
    repoName,
    repoOwner,
  });

  const res = {
    // default author
    author: optionsFromGithub.authenticatedUsername,

    // default values have lowest precedence
    ...defaultConfigOptions,

    // local config options override default options
    ...optionsFromConfigFiles,

    // remote config options override local config options
    ...optionsFromGithub,

    // cli args override the above
    ...optionsFromCliArgs,

    // required properties
    accessToken,
    repoName,
    repoOwner,
  };

  requireTargetBranch(res);

  return res;
}

type CombinedOptions = ReturnType<typeof getCombinedOptions>;
function getCombinedOptions({
  optionsFromConfigFiles,
  optionsFromCliArgs,
}: {
  optionsFromConfigFiles: OptionsFromConfigFiles;
  optionsFromCliArgs: OptionsFromCliArgs;
}) {
  return {
    ...defaultConfigOptions,
    ...optionsFromConfigFiles,
    ...optionsFromCliArgs,
  };
}

function requireAccessToken(combinedOptions: CombinedOptions): string {
  // accessToken must be supplied in config or via cli args
  if (!combinedOptions.accessToken) {
    const globalConfigPath = getGlobalConfigPath();
    throw new HandledError(
      `Please update your config file: "${globalConfigPath}".\nIt must contain a valid "accessToken".\n\nRead more: ${GLOBAL_CONFIG_DOCS_LINK}`
    );
  }
  return combinedOptions.accessToken;
}

function requireRepoName(combinedOptions: CombinedOptions): string {
  if (!combinedOptions.repoName) {
    throw new HandledError(
      `Please specify a repo name: "--repo-name kibana".\n\nRead more: ${PROJECT_CONFIG_DOCS_LINK}`
    );
  }
  return combinedOptions.repoName;
}

function requireRepoOwner(combinedOptions: CombinedOptions): string {
  if (!combinedOptions.repoOwner) {
    throw new HandledError(
      `Please specify a repo owner: "--repo-owner elastic".\n\nRead more: ${PROJECT_CONFIG_DOCS_LINK}`
    );
  }
  return combinedOptions.repoOwner;
}

function requireTargetBranch(config: {
  targetBranches: CombinedOptions['targetBranches'];
  targetBranchChoices: CombinedOptions['targetBranchChoices'];
  branchLabelMapping?: CombinedOptions['branchLabelMapping'];
}) {
  // ensure `targetBranches` or `targetBranchChoices` are given
  if (
    isEmpty(config.targetBranches) &&
    isEmpty(config.targetBranchChoices) &&
    // this is primarily necessary on CI where `targetBranches` and `targetBranchChoices` and not given
    isEmpty(config.branchLabelMapping)
  ) {
    throw new HandledError(
      `Please specify a target branch: "--branch 6.1".\n\nRead more: ${PROJECT_CONFIG_DOCS_LINK}`
    );
  }
}
