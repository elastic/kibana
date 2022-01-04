import { ConfigFileOptions } from '../ConfigOptions';
import { getOptionsFromGit } from './getOptionsFromGit';
import { getGlobalConfig } from './globalConfig';
import { getProjectConfig } from './projectConfig';

export type OptionsFromConfigFiles = Awaited<
  ReturnType<typeof getOptionsFromConfigFiles>
>;
export async function getOptionsFromConfigFiles(
  optionsFromModule?: ConfigFileOptions
) {
  const [gitConfig, projectConfig, globalConfig] = await Promise.all([
    getOptionsFromGit(),
    getProjectConfig(),
    getGlobalConfig(optionsFromModule?.ci),
  ]);

  return {
    ...gitConfig,
    ...globalConfig,
    ...projectConfig,
    ...optionsFromModule,
  };
}
