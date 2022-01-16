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

type Options = Partial<{
  accessToken: string;
  assignees: string[];
  author: string | null;
  autoAssign: boolean;
  autoFixConflicts: AutoFixConflictsHandler;
  autoMerge: boolean;
  autoMergeMethod: string;
  backportBinary: string;
  cherrypickRef: boolean;
  ci: boolean; // only available via cli and module options (not project or global config)
  commitPaths: string[];
  configFile: string; // only available via cli and module options (not project or global config)
  details: boolean;
  dir: string;
  editor: string;
  fork: boolean;
  gitHostname: string;
  githubApiBaseUrlV3: string;
  githubApiBaseUrlV4: string;
  logFilePath: string;
  maxNumber: number;
  multiple: boolean;
  multipleBranches: boolean;
  multipleCommits: boolean;
  noVerify: boolean;
  prDescription: string;
  prFilter: string;
  prTitle: string;
  publishStatusComment: boolean;
  pullNumber: number;
  repoName: string;
  repoOwner: string;
  resetAuthor: boolean;
  reviewers: string[];
  sha: string;
  skipRemoteConfig: boolean;
  sourceBranch: string;
  sourcePRLabels: string[];
  targetBranchChoices: TargetBranchChoiceOrString[];
  targetBranches: string[];
  targetPRLabels: string[];
  verbose: boolean;
}>;

export type ConfigFileOptions = Options &
  Partial<{
    // only allowed in project config. Not allowed in CI and denoted in plural (historicalBranchLabelMappings) in options from Github
    branchLabelMapping: Record<string, string>;

    /**
     * @deprecated Replaced by `repoOwner` and `repoName`
     */
    upstream: string;

    /**
     * @deprecated Replaced by `targetBranchChoices`
     */
    branches: TargetBranchChoiceOrString[];

    /**
     * @deprecated Replaced by `targetPRLabels`
     */
    labels: string[];
  }>;
