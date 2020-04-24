// Commit object selected from list or via commit sha
export interface CommitSelected {
  sourceBranch: string;
  targetBranches: string[];
  sha: string;
  formattedMessage: string;
  pullNumber?: number;
}

// commit object displayed in list of prompt choices
export interface CommitChoice extends CommitSelected {
  existingTargetPullRequests: {
    branch: string;
    state: 'OPEN' | 'CLOSED' | 'MERGED';
  }[];
}
