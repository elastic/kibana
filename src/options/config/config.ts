import { ConfigOptions } from '../ConfigOptions';
import { getGlobalConfig } from './globalConfig';
import { getProjectConfig } from './projectConfig';

export async function getOptionsFromConfigFiles(
  ci?: boolean
): Promise<ConfigOptions> {
  const [projectConfig, globalConfig] = await Promise.all([
    getProjectConfig(),
    getGlobalConfig(ci),
  ]);
  // global and project config combined
  return { ...globalConfig, ...projectConfig };
}
