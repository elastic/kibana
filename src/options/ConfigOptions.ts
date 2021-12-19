import { Logger } from '../services/logger';

export interface TargetBranchChoice {
  name: string;
  checked?: boolean;
}
export type TargetBranchChoiceOrString = string | TargetBranchChoice;

type AutoFixConflictsHandler = ({
  files,
  directory,
  logger,
  targetBranch,
}: {
  files: string[];
  directory: string;
  logger: Logger;
  targetBranch: string;
}) => boolean | Promise<boolean>;

export type ConfigOptions = Partial<{
  accessToken: string;
  all: boolean;
  assignees: string[];
  author: string;
  autoAssign: boolean;
  autoFixConflicts: AutoFixConflictsHandler;
  autoMerge: boolean;
  autoMergeMethod: string;
  branchLabelMapping: Record<string, string>;
  ci: boolean;
  commitPaths: string[];
  details: boolean;
  editor: string;
  forceLocalConfig: boolean;
  fork: boolean;
  gitHostname: string;
  githubApiBaseUrlV3: string;
  githubApiBaseUrlV4: string;
  maxNumber: number;
  multiple: boolean;
  multipleBranches: boolean;
  multipleCommits: boolean;
  noVerify: boolean;
  prDescription: string;
  prFilter: string;
  prTitle: string;
  pullNumber: number;
  resetAuthor: boolean;
  sha: string;
  sourceBranch: string;
  sourcePRLabels: string[];
  targetBranchChoices: TargetBranchChoiceOrString[];
  targetBranches: string[];
  targetPRLabels: string[];
  upstream: string;
  username: string;
  verbose: boolean;

  // deprecated: renamed to `targetBranchChoices`
  branches: TargetBranchChoiceOrString[];

  // deprecated: renamed to `targetPRLabels`
  labels: string[];
}>;
