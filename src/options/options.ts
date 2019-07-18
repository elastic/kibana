import isEmpty from 'lodash.isempty';
import { HandledError } from '../services/HandledError';
import { PromiseReturnType } from '../types/commons';
import { getGlobalConfigPath } from '../services/env';
import { OptionsFromCliArgs, getOptionsFromCliArgs } from './cliArgs';
import { getOptionsFromConfigFiles } from './config/config';

export type BackportOptions = Readonly<PromiseReturnType<typeof getOptions>>;
export async function getOptions(argv: string[]) {
  const optionsFromConfig = await getOptionsFromConfigFiles();
  const optionsFromCli = getOptionsFromCliArgs(optionsFromConfig, argv);
  return validateRequiredOptions(optionsFromCli);
}

const GLOBAL_CONFIG_DOCS_LINK =
  'https://github.com/sqren/backport/blob/1bd66ad5705a8e80501290ac7456e04108cb34be/docs/configuration.md#global-config-backportconfigjson';

const PROJECT_CONFIG_DOCS_LINK =
  'https://github.com/sqren/backport/blob/1bd66ad5705a8e80501290ac7456e04108cb34be/docs/configuration.md#project-config-backportrcjson';

function getErrorMessage({
  field,
  exampleValue
}: {
  field: keyof OptionsFromCliArgs;
  exampleValue: string;
}) {
  // all properties can theoretically go into either config file but it is not recommended
  // to add `username` or `accessToken` in the project config (.backportrc.json)
  const isGlobalConfigProperty =
    field === 'accessToken' || field === 'username';

  const globalConfigPath = getGlobalConfigPath();
  const configFileMessage = isGlobalConfigProperty
    ? `Config file: "${globalConfigPath}". Read more: ${GLOBAL_CONFIG_DOCS_LINK}`
    : `Config file: ".backportrc.json". Read more: ${PROJECT_CONFIG_DOCS_LINK}`;

  return `Invalid option "${field}"\n\nYou can add it with either:\n - ${configFileMessage}\n - CLI: "--${field} ${exampleValue}"`;
}

export function validateRequiredOptions({
  upstream = '',
  ...options
}: OptionsFromCliArgs) {
  if (!options.accessToken) {
    throw new HandledError(
      getErrorMessage({ field: 'accessToken', exampleValue: 'myAccessToken' })
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

  if (!options.username) {
    throw new HandledError(
      getErrorMessage({ field: 'username', exampleValue: 'sqren' })
    );
  }

  return {
    ...options,
    accessToken: options.accessToken,
    repoName,
    repoOwner,
    username: options.username,
    author: options.author || options.username
  };
}
