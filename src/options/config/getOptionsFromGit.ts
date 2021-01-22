import { getUpstreamFromGitRemote } from '../../services/git';

export async function getOptionsFromGit() {
  return {
    upstream: await getUpstreamFromGitRemote(),
  };
}
