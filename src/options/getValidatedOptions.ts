import isEmpty from 'lodash.isempty';
import { HandledError } from '../services/HandledError';
import { getGlobalConfigPath } from '../services/env';
import { OptionsFromCliArgs } from './cliArgs';

const GLOBAL_CONFIG_DOCS_LINK =
  'https://github.com/sqren/backport/blob/e119d71d6dc03cd061f6ad9b9a8b1cd995f98961/docs/configuration.md#global-config-backportconfigjson';

const PROJECT_CONFIG_DOCS_LINK =
  'https://github.com/sqren/backport/blob/e119d71d6dc03cd061f6ad9b9a8b1cd995f98961/docs/configuration.md#project-config-backportrcjson';

export type ValidatedOptions = ReturnType<typeof getValidatedOptions>;
export function getValidatedOptions({
  // omit `upstream` from options
  upstream,
  ...options
}: OptionsFromCliArgs) {
  // ensure accessToken and username are given
  if (!options.accessToken || !options.username) {
    const globalConfigPath = getGlobalConfigPath();
    throw new HandledError(
      `Please update your config file: ${globalConfigPath}.\nIt must contain a valid "username" and "accessToken".\n\nRead more: ${GLOBAL_CONFIG_DOCS_LINK}`
    );
  }

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

  // ensure a valid upstream is given
  const [repoOwner, repoName] = (upstream ?? '').split('/');
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
