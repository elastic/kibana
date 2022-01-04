import { getRepoOwnerAndNameFromGitRemote } from '../../services/git';

export async function getOptionsFromGit() {
  return getRepoOwnerAndNameFromGitRemote();
}
