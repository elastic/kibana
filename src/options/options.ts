import isEmpty from 'lodash.isempty';
import { HandledError } from '../services/HandledError';
import { getGlobalConfigPath } from '../services/env';
import { getDefaultRepoBranchAndPerformStartupChecks } from '../services/github/v4/getDefaultRepoBranchAndPerformStartupChecks';
import { PromiseReturnType } from '../types/PromiseReturnType';
import { getOptionsFromCliArgs, OptionsFromCliArgs } from './cliArgs';
import { getOptionsFromConfigFiles } from './config/config';

export type BackportOptions = Readonly<PromiseReturnType<typeof getOptions>>;
export async function getOptions(argv: readonly string[]) {
  const optionsFromConfig = await getOptionsFromConfigFiles();
  const optionsFromCli = getOptionsFromCliArgs(optionsFromConfig, argv);
  const validatedOptions = validateRequiredOptions(optionsFromCli);

  const { defaultBranch } = await getDefaultRepoBranchAndPerformStartupChecks(
    validatedOptions
  );

  return {
    ...validatedOptions,
    sourceBranch: validatedOptions.sourceBranch
      ? validatedOptions.sourceBranch
      : defaultBranch,
  };
}

const GLOBAL_CONFIG_DOCS_LINK =
  'https://github.com/sqren/backport/blob/434a28b431bb58c9a014d4489a95f561e6bb2769/docs/configuration.md#global-config-backportconfigjson';

const PROJECT_CONFIG_DOCS_LINK =
  'https://github.com/sqren/backport/blob/434a28b431bb58c9a014d4489a95f561e6bb2769/docs/configuration.md#project-config-backportrcjson';

export function validateRequiredOptions({
  upstream = '',
  ...options
}: OptionsFromCliArgs) {
  if (!options.accessToken || !options.username) {
    const globalConfigPath = getGlobalConfigPath();
    throw new HandledError(
      `Please update your config file: ${globalConfigPath}.\nIt must contain a valid "username" and "accessToken".\n\nRead more: ${GLOBAL_CONFIG_DOCS_LINK}`
    );
  }

  if (isEmpty(options.targetBranches) && isEmpty(options.targetBranchChoices)) {
    throw new HandledError(
      `You must specify a target branch\n\nYou can specify it via either:\n - Config file (recommended): ".backportrc.json". Read more: ${PROJECT_CONFIG_DOCS_LINK}\n - CLI: "--branch 6.1"`
    );
  }

  const [repoOwner, repoName] = upstream.split('/');
  if (!repoOwner || !repoName) {
    throw new HandledError(
      `You must specify a valid Github repository\n\nYou can specify it via either:\n - Config file (recommended): ".backportrc.json". Read more: ${PROJECT_CONFIG_DOCS_LINK}\n - CLI: "--upstream elastic/kibana"`
    );
  }

  return {
    ...options,

    // no longer optional
    accessToken: options.accessToken,
    username: options.username,

    // split upstream
    repoName,
    repoOwner,

    // define author
    author: options.author || options.username,
    all: options.author ? false : options.all,
  };
}
