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
  branches?: (string | BranchChoice)[];
  upstream?: string;
  fork?: boolean;

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
