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

  const {
    // backwards-compatability: `branches` was renamed `targetBranchChoices`
    targetBranchChoices,
    branches,

    // backwards-compatability: `labels` was renamed `targetPRLabels`
    targetPRLabels,
    labels,

    // global and project config combined
    ...combinedConfig
  } = {
    ...globalConfig,
    ...projectConfig,
  };

  return {
    // defaults
    all: false, // show users own commits
    fork: true, // push target branch to {username}/{repoName}
    gitHostname: 'github.com',
    githubApiBaseUrlV3: 'https://api.github.com',
    githubApiBaseUrlV4: 'https://api.github.com/graphql',
    maxNumber: 10, // display 10 commits to pick from
    multiple: false,
    multipleBranches: true, // allow user to pick multiple target branches
    multipleCommits: false, // only let user pick a single commit
    noVerify: true,
    prTitle: '[{targetBranch}] {commitMessages}',
    sourcePRLabels: [] as string[] | never[],
    targetBranchChoices: getTargetBranchChoicesAsObject(
      // backwards-compatability: `branches` was renamed `targetBranchChoices`
      targetBranchChoices || branches
    ),

    // backwards-compatability: `labels` was renamed `targetPRLabels`
    targetPRLabels: targetPRLabels || labels || ([] as string[]),

    // merge defaults with config values
    ...combinedConfig,
  };
}

// in the config `branches` can either be a string or an object.
// We need to transform it so that it is always treated as an object troughout the application
function getTargetBranchChoicesAsObject(
  targetBranchChoices?: Config['targetBranchChoices']
) {
  if (!targetBranchChoices) {
    return;
  }

  return targetBranchChoices.map((choice) => {
    if (isString(choice)) {
      return {
        name: choice,
        checked: false,
      };
    }

    return choice;
  });
}
