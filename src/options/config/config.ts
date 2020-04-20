import isString from 'lodash.isstring';
import { Config } from '../../types/Config';
import { PromiseReturnType } from '../../types/PromiseReturnType';
import { getGlobalConfig } from './globalConfig';
import { getProjectConfig } from './projectConfig';

export type OptionsFromConfigFiles = PromiseReturnType<
  typeof getOptionsFromConfigFiles
>;
export async function getOptionsFromConfigFiles() {
  const [projectConfig, globalConfig] = await Promise.all([
    getProjectConfig(),
    getGlobalConfig(),
  ]);

  const { branches, ...combinedConfig } = {
    ...globalConfig,
    ...projectConfig,
  };

  return {
    // defaults
    backportCreatedLabels: [] as string[] | never[],
    fork: true,
    multiple: false,
    multipleCommits: false,
    multipleBranches: true,
    all: false,
    labels: [] as string[],
    prTitle: '[{targetBranch}] {commitMessages}',
    gitHostname: 'github.com',
    githubApiBaseUrlV3: 'https://api.github.com',
    githubApiBaseUrlV4: 'https://api.github.com/graphql',
    targetBranchChoices: getTargetBranchChoices(branches),
    ...combinedConfig,
  };
}

// in the config `branches` can either be a string or an object.
// We need to transform it so that it is always treated as an object troughout the application
function getTargetBranchChoices(branches?: Config['branches']) {
  if (!branches) {
    return;
  }

  return branches.map((choice) => {
    if (isString(choice)) {
      return {
        name: choice,
        checked: false,
      };
    }

    return choice;
  });
}
