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
  backportCreatedLabels?: string[];
  commitsCount?: number;
  gitHostname?: string;
  labels?: string[];
  multiple?: boolean;
  multipleBranches?: boolean;
  multipleCommits?: boolean;
  path?: string;
  prDescription?: string;
  prTitle?: string;
}
