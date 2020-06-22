import { ConfigOptions } from '../ConfigOptions';
import { getGlobalConfig } from './globalConfig';
import { getProjectConfig } from './projectConfig';

export async function getOptionsFromConfigFiles(): Promise<ConfigOptions> {
  const [projectConfig, globalConfig] = await Promise.all([
    getProjectConfig(),
    getGlobalConfig(),
  ]);
  // global and project config combined
  return { ...globalConfig, ...projectConfig };
}
