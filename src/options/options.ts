import isEmpty from 'lodash.isempty';
import { HandledError } from '../services/HandledError';
import { OptionsFromCliArgs, getOptionsFromCliArgs } from './cliArgs';
import { getOptionsFromConfigFiles } from './config/config';
import { PromiseReturnType } from '../types/commons';
import { getGlobalConfigPath } from '../services/env';

export type BackportOptions = PromiseReturnType<typeof getOptions>;
export async function getOptions(argv: typeof process.argv) {
  const optionsFromConfig = await getOptionsFromConfigFiles();
  const optionsFromCli = getOptionsFromCliArgs(optionsFromConfig, argv);
  return validateOptions(optionsFromCli);
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
  const isGlobalConfigProperty =
    field === 'accessToken' || field === 'username';

  const globalConfigPath = getGlobalConfigPath();

  const configFileMessage = isGlobalConfigProperty
    ? `Config file: "${globalConfigPath}". Read more: ${GLOBAL_CONFIG_DOCS_LINK}`
    : `Config file: ".backportrc.json". Read more: ${PROJECT_CONFIG_DOCS_LINK}`;

  return `Invalid option "${field}"\n\nYou can add it with either:\n - ${configFileMessage}\n - CLI: "--${field} ${exampleValue}"`;
}

export function validateOptions({
  accessToken,
  all,
  branchChoices,
  branches,
  labels,
  multiple,
  multipleBranches,
  multipleCommits,
  prTitle,
  prDescription,
  sha,
  upstream,
  username
}: OptionsFromCliArgs) {
  if (!accessToken) {
    throw new HandledError(
      getErrorMessage({ field: 'accessToken', exampleValue: 'myAccessToken' })
    );
  }

  if (isEmpty(branches) && isEmpty(branchChoices)) {
    throw new HandledError(
      getErrorMessage({ field: 'branches', exampleValue: '6.1' })
    );
  }

  if (!upstream) {
    throw new HandledError(
      getErrorMessage({ field: 'upstream', exampleValue: 'elastic/kibana' })
    );
  }

  if (!username) {
    throw new HandledError(
      getErrorMessage({ field: 'username', exampleValue: 'sqren' })
    );
  }

  return {
    accessToken,
    all,
    branchChoices,
    branches,
    labels,
    multiple,
    multipleBranches,
    multipleCommits,
    prTitle,
    prDescription,
    sha,
    upstream,
    username
  };
}
