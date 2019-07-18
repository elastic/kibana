export interface BranchChoice {
  name: string;
  checked?: boolean;
}

export interface Config {
  // global config
  accessToken?: string;
  username?: string;

  // project config
  branches?: (string | BranchChoice)[];
  upstream?: string;

  // both
  all?: boolean;
  author?: string;
  apiHostname?: string;
  commitsCount?: number;
  gitHostname?: string;
  labels?: string[];
  multiple?: boolean;
  multipleBranches?: boolean;
  multipleCommits?: boolean;
  prDescription?: string;
  prTitle?: string;
}
