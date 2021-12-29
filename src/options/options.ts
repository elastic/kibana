import { getOptionsFromGithub } from '../services/github/v4/getOptionsFromGithub';
import { updateLogger } from './../services/logger';
import { ConfigFileOptions } from './ConfigOptions';
import { getOptionsFromCliArgs } from './cliArgs';
import { getOptionsFromConfigFiles } from './config/config';
import { parseRequiredOptions } from './parseRequiredOptions';

export type ValidConfigOptions = Readonly<
  Awaited<ReturnType<typeof getOptions>>
>;

export async function getOptions(
  argv: string[],
  optionsFromModule?: ConfigFileOptions
) {
  const optionsFromConfigFiles = await getOptionsFromConfigFiles(
    optionsFromModule
  );
  const optionsFromCliArgs = getOptionsFromCliArgs(argv);

  // update logger
  updateLogger({ ...optionsFromConfigFiles, ...optionsFromCliArgs });

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
