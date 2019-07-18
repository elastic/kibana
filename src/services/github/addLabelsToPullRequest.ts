import axios from 'axios';
import { BackportOptions } from '../../options/options';
import { handleGithubError } from './handleGithubError';

export async function addLabelsToPullRequest(
  { apiHostname, repoName, repoOwner, labels, accessToken }: BackportOptions,
  pullNumber: number
) {
  try {
    return await axios.post(
      `https://${apiHostname}/repos/${repoOwner}/${repoName}/issues/${pullNumber}/labels?access_token=${accessToken}`,
      labels
    );
  } catch (e) {
    throw handleGithubError(e);
  }
}
