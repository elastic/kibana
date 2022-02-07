import { ConfigFileOptions } from '../ConfigOptions';
import { OptionsFromCliArgs } from '../cliArgs';
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
    optionsFromCliArgs.configFile ?? optionsFromModule.configFile;

  const [projectConfig, globalConfig] = await Promise.all([
    getProjectConfig({ configFile }),
    ci ? undefined : getGlobalConfig(),
  ]);

  return {
    ...globalConfig,
    ...projectConfig,
    ...optionsFromModule,
  };
}
