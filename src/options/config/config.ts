import isString from 'lodash.isstring';
import { Config } from '../../types/Config';
import { PromiseReturnType } from '../../types/commons';
import { getGlobalConfig } from './globalConfig';
import { getProjectConfig } from './projectConfig';

export type OptionsFromConfigFiles = PromiseReturnType<
  typeof getOptionsFromConfigFiles
>;
export async function getOptionsFromConfigFiles() {
  const [projectConfig, globalConfig] = await Promise.all([
    getProjectConfig(),
    getGlobalConfig()
  ]);

  const { branches, ...combinedConfig } = {
    ...globalConfig,
    ...projectConfig
  };

  return {
    // defaults
    backportCreatedLabels: [] as string[],
    fork: true,
    multiple: false,
    multipleCommits: false,
    multipleBranches: true,
    all: false,
    labels: [] as string[],
    prTitle: '[{baseBranch}] {commitMessages}',
    gitHostname: 'github.com',
    apiHostname: 'api.github.com',
    branchChoices: getBranchesAsObjects(branches),
    ...combinedConfig
  };
}

// in the config `branches` can either a string or an object.
// We need to transform it so that it is always treated as an object troughout the application
function getBranchesAsObjects(branches?: Config['branches']) {
  if (!branches) {
    return;
  }

  return branches.map(choice => {
    if (isString(choice)) {
      return {
        name: choice,
        checked: false
      };
    }

    return choice;
  });
}
