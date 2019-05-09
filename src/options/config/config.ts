import { getGlobalConfig } from './globalConfig';
import { getProjectConfig } from './projectConfig';
import { PromiseReturnType } from '../../types/commons';

export type OptionsFromConfigFiles = PromiseReturnType<
  typeof getOptionsFromConfigFiles
>;
export async function getOptionsFromConfigFiles() {
  const [projectConfig, globalConfig] = await Promise.all([
    getProjectConfig(),
    getGlobalConfig()
  ]);

  return {
    // defaults
    multiple: false,
    multipleCommits: false,
    multipleBranches: true,
    all: false,
    labels: [] as string[],
    prTitle: '[{baseBranch}] {commitMessages}',

    // options from config files
    ...globalConfig,
    ...projectConfig
  };
}
