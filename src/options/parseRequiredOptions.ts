import isEmpty from 'lodash.isempty';
import isString from 'lodash.isstring';
import { HandledError } from '../services/HandledError';
import { getGlobalConfigPath } from '../services/env';
import { OptionsFromGithub } from '../services/github/v4/getOptionsFromGithub';
import {
  TargetBranchChoiceOrString,
  TargetBranchChoice,
  ConfigOptions,
} from './ConfigOptions';
import { OptionsFromCliArgs } from './cliArgs';
import { OptionsFromConfigFiles } from './config/config';

const PROJECT_CONFIG_DOCS_LINK =
  'https://github.com/sqren/backport/blob/e119d71d6dc03cd061f6ad9b9a8b1cd995f98961/docs/configuration.md#project-config-backportrcjson';

const GLOBAL_CONFIG_DOCS_LINK =
  'https://github.com/sqren/backport/blob/e119d71d6dc03cd061f6ad9b9a8b1cd995f98961/docs/configuration.md#global-config-backportconfigjson';

export type ValidatedOptions = ReturnType<typeof parseRequiredOptions>;
export function parseRequiredOptions(
  optionsFromConfigFiles: OptionsFromConfigFiles,
  optionsFromCliArgs: OptionsFromCliArgs,
  optionsFromGithub: OptionsFromGithub
) {
  const options = {
    // local config files have lowest precedence
    ...optionsFromConfigFiles,

    // remote config options override local config options
    ...optionsFromGithub,

    // cli args override both of the above
    ...optionsFromCliArgs,
  } as OptionsFromCliArgs & OptionsFromConfigFiles & OptionsFromGithub;

  // ensure `targetBranches` or `targetBranchChoices` are given
  if (
    isEmpty(options.targetBranches) &&
    isEmpty(options.targetBranchChoices) &&
    // this is primarily necessary on CI where `targetBranches` and `targetBranchChoices` and not given
    isEmpty(options.branchLabelMapping)
  ) {
    throw new HandledError(
      `You must specify a target branch\n\nYou can specify it via either:\n - Config file (recommended): ".backportrc.json". Read more: ${PROJECT_CONFIG_DOCS_LINK}\n - CLI: "--branch 6.1"`
    );
  }

  const { accessToken, username, repoName, repoOwner } =
    getRequiredOptions(options);

  return {
    ...options,

    // convert from array of primitives to array of object
    targetBranchChoices: getTargetBranchChoicesAsObject(
      options.targetBranchChoices
    ),

    // required options
    accessToken,
    username,
    repoName,
    repoOwner,

    // auto-assign the current user or default to the specified assignees
    assignees: options.autoAssign
      ? [options.username as string]
      : options.assignees,

    author: options.author || username,
    all: options.author ? false : options.all,
  };
}

// `branches` can either be a string or an object.
// It must be transformed so it is always treated as an object troughout the application
function getTargetBranchChoicesAsObject(
  targetBranchChoices: TargetBranchChoiceOrString[]
): TargetBranchChoice[] {
  return targetBranchChoices.map((choice) => {
    if (isString(choice)) {
      return {
        name: choice,
        checked: false,
      };
    }

    return choice;
  });
}

export function getRequiredOptions({
  accessToken,
  username,
  upstream,
}: ConfigOptions) {
  // accessToken and username must be supplied in config or via cli args
  if (!accessToken || !username) {
    const globalConfigPath = getGlobalConfigPath();
    throw new HandledError(
      `Please update your config file: ${globalConfigPath}.\nIt must contain a valid "username" and "accessToken".\n\nRead more: ${GLOBAL_CONFIG_DOCS_LINK}`
    );
  }

  // upstream must be specified via config or cli args
  const [repoOwner, repoName] = (upstream ?? '').split('/');
  if (!repoOwner || !repoName) {
    throw new HandledError(
      `You must specify a valid Github repository\n\nYou can specify it via either:\n - Config file (recommended): ".backportrc.json". Read more: ${PROJECT_CONFIG_DOCS_LINK}\n - CLI: "--upstream elastic/kibana"`
    );
  }

  return { accessToken, username, repoOwner, repoName };
}
