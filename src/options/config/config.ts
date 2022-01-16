import { ConfigFileOptions } from '../ConfigOptions';
import { OptionsFromCliArgs } from '../cliArgs';
import { getOptionsFromGit } from './getOptionsFromGit';
import { getGlobalConfig } from './globalConfig';
import { getProjectConfig } from './projectConfig';

export type OptionsFromConfigFiles = Awaited<
  ReturnType<typeof getOptionsFromConfigFiles>
>;
export async function getOptionsFromConfigFiles({
  optionsFromCliArgs,
  optionsFromModule,
  defaultConfigOptions,
}: {
  optionsFromCliArgs: OptionsFromCliArgs;
  optionsFromModule: ConfigFileOptions;
  defaultConfigOptions: ConfigFileOptions;
}) {
  // ci: cli and module only flag
  const ci =
    optionsFromCliArgs.ci ?? optionsFromModule.ci ?? defaultConfigOptions.ci;

  // ci: cli and module only flag
  const configFile =
    optionsFromCliArgs.configFile ??
    optionsFromModule.configFile ??
    defaultConfigOptions.configFile;

  const [gitConfig, projectConfig, globalConfig] = await Promise.all([
    getOptionsFromGit(),
    getProjectConfig({ configFile }),
    ci ? undefined : getGlobalConfig(),
  ]);

  return {
    ...gitConfig,
    ...globalConfig,
    ...projectConfig,
    ...optionsFromModule,
  };
}
