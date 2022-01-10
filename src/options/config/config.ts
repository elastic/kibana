import { ConfigFileOptions } from '../ConfigOptions';
import { getOptionsFromGit } from './getOptionsFromGit';
import { getGlobalConfig } from './globalConfig';
import { getProjectConfig } from './projectConfig';

export type OptionsFromConfigFiles = Awaited<
  ReturnType<typeof getOptionsFromConfigFiles>
>;
export async function getOptionsFromConfigFiles({
  optionsFromModule,
  ci,
}: {
  optionsFromModule?: ConfigFileOptions;
  ci: boolean;
}) {
  const [gitConfig, projectConfig, globalConfig] = await Promise.all([
    getOptionsFromGit(),
    getProjectConfig(),
    ci ? undefined : getGlobalConfig(),
  ]);

  return {
    ...gitConfig,
    ...globalConfig,
    ...projectConfig,
    ...optionsFromModule,
  };
}
