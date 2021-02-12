import { PromiseReturnType } from '../../types/PromiseReturnType';
import { ConfigOptions } from '../ConfigOptions';
import { getOptionsFromGit } from './getOptionsFromGit';
import { getGlobalConfig } from './globalConfig';
import { getProjectConfig } from './projectConfig';

export const defaultConfigOptions = {
  all: false,
  assignees: [],
  autoAssign: false,
  autoMerge: false,
  autoMergeMethod: 'merge',
  ci: false,
  dryRun: false,
  fork: true,
  gitHostname: 'github.com',
  githubApiBaseUrlV3: 'https://api.github.com',
  githubApiBaseUrlV4: 'https://api.github.com/graphql',
  maxNumber: 10,
  multipleBranches: true,
  multipleCommits: false,
  noVerify: true,
  prTitle: '[{targetBranch}] {commitMessages}',
  resetAuthor: false,
  sourcePRLabels: [],
  targetBranches: [],
  targetBranchChoices: [],
  targetPRLabels: [],
  verbose: false,
};

export type OptionsFromConfigFiles = PromiseReturnType<
  typeof getOptionsFromConfigFiles
>;
export async function getOptionsFromConfigFiles(
  optionsFromModule?: ConfigOptions
) {
  const [gitConfig, projectConfig, globalConfig] = await Promise.all([
    getOptionsFromGit(),
    getProjectConfig(),
    getGlobalConfig(optionsFromModule?.ci),
  ]);

  // global and project config combined
  const combinedConfig = {
    ...gitConfig,
    ...globalConfig,
    ...projectConfig,
    ...optionsFromModule,
  };

  return {
    ...defaultConfigOptions,
    ...combinedConfig,

    // backwards-compatability: `labels` was renamed `targetPRLabels`
    targetPRLabels:
      combinedConfig.targetPRLabels ?? combinedConfig.labels ?? [],

    // backwards-compatability: `branches` was renamed `targetBranchChoices`
    targetBranchChoices:
      combinedConfig.targetBranchChoices ?? combinedConfig.branches ?? [],
  };
}
