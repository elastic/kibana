import findUp from 'find-up';
import { readConfigFile } from '../config/readConfigFile';
import isString from 'lodash.isstring';

export interface BranchChoice {
  name: string;
  checked?: boolean;
}

interface ProjectConfigBase {
  upstream?: string;
  labels?: string[];

  // the following can also be set in global config:
  all?: boolean;
  multiple?: boolean;
  multipleCommits?: boolean;
  multipleBranches?: boolean;
}

interface ProjectConfigFile extends ProjectConfigBase {
  branches?: (string | BranchChoice)[];
}

interface ProjectConfig extends ProjectConfigBase {
  branchChoices?: BranchChoice[];
}

export async function getProjectConfig(): Promise<ProjectConfig> {
  const filepath = await findUp('.backportrc.json');
  if (!filepath) {
    return {};
  }

  const { branches, ...restConfig } = await readConfigFile<ProjectConfigFile>(
    filepath
  );
  return {
    ...restConfig,
    branchChoices: getBranchesAsObjects(branches)
  };
}

function getBranchesAsObjects(branches: ProjectConfigFile['branches']) {
  if (!branches) {
    return;
  }

  return branches.map(choice => {
    return isString(choice)
      ? {
          name: choice,
          checked: false
        }
      : choice;
  });
}
