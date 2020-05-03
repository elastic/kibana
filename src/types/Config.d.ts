export interface BranchChoice {
  name: string;
  checked?: boolean;
}

export interface Config {
  // global config
  accessToken?: string;
  username?: string;
  editor?: string;

  // project config
  branchLabelMapping?: Record<string, string>;
  fork?: boolean;
  noVerify?: boolean;
  targetBranchChoices?: (string | BranchChoice)[];
  upstream?: string;

  // both
  all?: boolean;
  author?: string;
  gitHostname?: string;
  githubApiBaseUrlV3?: string;
  githubApiBaseUrlV4?: string;
  maxNumber?: number;
  multiple?: boolean;
  multipleBranches?: boolean;
  multipleCommits?: boolean;
  path?: string;
  prDescription?: string;
  prTitle?: string;
  sourceBranch?: string;
  sourcePRLabels?: string[];
  targetPRLabels?: string[];

  // deprecated - kept for backwards compatability
  branches?: (string | BranchChoice)[];
  labels?: string[];
}
