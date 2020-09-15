import { ExistingTargetPullRequests } from '../services/github/v4/getExistingTargetPullRequests';

export interface Commit {
  sourceBranch: string;
  targetBranchesFromLabels: string[];
  sha: string;
  formattedMessage: string;
  originalMessage: string;
  pullNumber?: number;
  existingTargetPullRequests: ExistingTargetPullRequests;
}
