import axios from 'axios';
import { BackportOptions } from '../../options/options';
import { handleGithubError } from './handleGithubError';
import { logger } from '../logger';

export async function addLabelsToPullRequest(
  { apiHostname, repoName, repoOwner, accessToken }: BackportOptions,
  pullNumber: number,
  labels: string[]
) {
  logger.info(`Adding label "${labels}" to #${pullNumber}`);

  try {
    return await axios.post(
      `https://${apiHostname}/repos/${repoOwner}/${repoName}/issues/${pullNumber}/labels?access_token=${accessToken}`,
      labels
    );
  } catch (e) {
    throw handleGithubError(e);
  }
}
