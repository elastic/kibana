import { getOptionsFromGithub } from '../services/github/v4/getOptionsFromGithub';
import { updateLogger } from './../services/logger';
import { ConfigOptions } from './ConfigOptions';
import { getOptionsFromCliArgs } from './cliArgs';
import { getOptionsFromConfigFiles } from './config/config';
import { parseRequiredOptions } from './parseRequiredOptions';

export type ValidConfigOptions = Readonly<
  Awaited<ReturnType<typeof getOptions>>
>;
export async function getOptions(
  argv: string[],
  optionsFromModule?: ConfigOptions
) {
  const optionsFromConfigFiles = await getOptionsFromConfigFiles(
    optionsFromModule
  );
  const optionsFromCliArgs = getOptionsFromCliArgs(argv);

  // update logger
  updateLogger({ ...optionsFromConfigFiles, ...optionsFromCliArgs });

  // TODO: make `username` optional by defaulting to `currentUsername`
  const optionsFromGithub = await getOptionsFromGithub(
    optionsFromConfigFiles,
    optionsFromCliArgs
  );

  const parsedOptions = parseRequiredOptions(
    optionsFromConfigFiles,
    optionsFromCliArgs,
    optionsFromGithub
  );
  return parsedOptions;
}
