import { isEmpty } from 'lodash';
import { HandledError } from '../services/HandledError';
import { getGlobalConfigPath } from '../services/env';
import {
  getOptionsFromGithub,
  OptionsFromGithub,
} from '../services/github/v4/getOptionsFromGithub/getOptionsFromGithub';
import { getRepoOwnerAndNameFromGitRemotes } from '../services/github/v4/getRepoOwnerAndNameFromGitRemotes';
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

const defaultConfigOptions = {
  assignees: [] as Array<string>,
  autoAssign: false,
  autoMerge: false,
  autoMergeMethod: 'merge',
  backportBinary: 'backport',
  cherrypickRef: true,
  ci: false,
  commitPaths: [] as Array<string>,
  cwd: process.cwd(),
  dateSince: null,
  dateUntil: null,
  details: false,
  fork: true,
  gitHostname: 'github.com',
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
  const combined = getMergedOptionsFromConfigAndCli({
    optionsFromConfigFiles,
    optionsFromCliArgs,
  });

  const { accessToken, repoName, repoOwner } = await getRequiredOptions(
    combined
  );

  // update logger
  updateLogger({ accessToken, verbose: combined.verbose });

  const optionsFromGithub = await getOptionsFromGithub({
    ...combined,

    // required options
    accessToken,
    repoName,
    repoOwner,
  });

  const options = {
    // default author
    author: optionsFromGithub.authenticatedUsername,

    // default fork owner
    repoForkOwner: optionsFromGithub.authenticatedUsername,

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

  throwForRequiredOptions(options);

  return options;
}

async function getRequiredOptions(combined: OptionsFromConfigAndCli) {
  const { accessToken, repoName, repoOwner } = combined;

  if (accessToken && repoName && repoOwner) {
    return { accessToken, repoName, repoOwner };
  }

  // require access token
  if (!accessToken) {
    const globalConfigPath = getGlobalConfigPath();
    throw new HandledError(
      `Please update your config file: "${globalConfigPath}".\nIt must contain a valid "accessToken".\n\nRead more: ${GLOBAL_CONFIG_DOCS_LINK}`
    );
  }

  // attempt to retrieve repo-owner and repo-name from git remote
  const gitRemote = await getRepoOwnerAndNameFromGitRemotes({
    cwd: combined.cwd,
    githubApiBaseUrlV4: combined.githubApiBaseUrlV4,
    accessToken,
  });

  if (!gitRemote.repoName) {
    throw new HandledError(
      `Please specify a repo name: "--repo-name kibana".\n\nRead more: ${PROJECT_CONFIG_DOCS_LINK}`
    );
  }

  if (!gitRemote.repoOwner) {
    throw new HandledError(
      `Please specify a repo owner: "--repo-owner elastic".\n\nRead more: ${PROJECT_CONFIG_DOCS_LINK}`
    );
  }

  return {
    accessToken,
    repoName: gitRemote.repoName,
    repoOwner: gitRemote.repoOwner,
  };
}

function throwForRequiredOptions(
  options: OptionsFromConfigAndCli | OptionsFromGithub
) {
  // ensure `targetBranches` or `targetBranchChoices` are given
  if (
    isEmpty(options.targetBranches) &&
    isEmpty(options.targetBranchChoices) &&
    // this is primarily necessary on CI where `targetBranches` and `targetBranchChoices` and not given
    isEmpty(options.branchLabelMapping)
  ) {
    throw new HandledError(
      `Please specify a target branch: "--branch 6.1".\n\nRead more: ${PROJECT_CONFIG_DOCS_LINK}`
    );
  }

  const optionKeys: Array<keyof typeof options> = [
    'accessToken',
    'author',
    'autoMergeMethod',
    'backportBinary',
    'configFile',
    'dir',
    'editor',
    'gitHostname',
    'githubApiBaseUrlV3',
    'githubApiBaseUrlV4',
    'logFilePath',
    'prDescription',
    'prFilter',
    'prTitle',
    'repoForkOwner',
    'repoName',
    'repoOwner',
    'sha',
    'sourceBranch',
  ];

  // Disallow empty strings
  // this is primarily an issue in Github actions where inputs default to empty strings instead of undefined
  // in those cases failing early provides a better UX
  optionKeys.forEach((optionName) => {
    const option = options[optionName] as string;
    if (option === '') {
      throw new HandledError(`"${optionName}" cannot be empty!`);
    }
  });
}

type OptionsFromConfigAndCli = ReturnType<
  typeof getMergedOptionsFromConfigAndCli
>;
function getMergedOptionsFromConfigAndCli({
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
