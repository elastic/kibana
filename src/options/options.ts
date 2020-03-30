import isEmpty from 'lodash.isempty';
import { HandledError } from '../services/HandledError';
import { PromiseReturnType } from '../types/PromiseReturnType';
import { getGlobalConfigPath } from '../services/env';
import { getOptionsFromCliArgs, OptionsFromCliArgs } from './cliArgs';
import { getOptionsFromConfigFiles } from './config/config';
import { verifyAccessToken } from '../services/github/verifyAccessToken';
import { getDefaultRepoBranch } from '../services/github/getDefaultRepoBranch';

export type BackportOptions = Readonly<PromiseReturnType<typeof getOptions>>;
export async function getOptions(argv: string[]) {
  const optionsFromConfig = await getOptionsFromConfigFiles();
  const optionsFromCli = getOptionsFromCliArgs(optionsFromConfig, argv);
  const validatedOptions = validateRequiredOptions(optionsFromCli);

  await verifyAccessToken(validatedOptions);

  return {
    ...validatedOptions,
    sourceBranch: validatedOptions.sourceBranch
      ? validatedOptions.sourceBranch
      : await getDefaultRepoBranch(validatedOptions),
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

  if (isEmpty(options.branches) && isEmpty(options.branchChoices)) {
    throw new HandledError(
      getErrorMessage({ field: 'branches', exampleValue: '6.1' })
    );
  }

  const [repoOwner, repoName] = upstream.split('/');
  if (!repoOwner || !repoName) {
    throw new HandledError(
      getErrorMessage({ field: 'upstream', exampleValue: 'elastic/kibana' })
    );
  }

  return {
    ...options,
    accessToken: options.accessToken,
    repoName,
    repoOwner,
    username: options.username,
    author: options.author || options.username,
  };
}

function getErrorMessage({
  field,
  exampleValue,
}: {
  field: keyof OptionsFromCliArgs;
  exampleValue: string;
}) {
  return `Invalid option "${field}"\n\nYou can add it with either:\n - Config file: ".backportrc.json". Read more: ${PROJECT_CONFIG_DOCS_LINK}\n - CLI: "--${field} ${exampleValue}"`;
}
