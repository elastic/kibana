import axios from 'axios';
import { BackportOptions } from '../../options/options';
import { handleGithubError } from './handleGithubError';
import { logger } from '../logger';

export async function addLabelsToPullRequest(
  { apiHostname, repoName, repoOwner, accessToken, username }: BackportOptions,
  pullNumber: number,
  labels: string[]
) {
  logger.info(`Adding label "${labels}" to #${pullNumber}`);

  try {
    return await axios.post(
      `https://${apiHostname}/repos/${repoOwner}/${repoName}/issues/${pullNumber}/labels`,
      labels,
      {
        auth: {
          username: username,
          password: accessToken
        }
      }
    );
  } catch (e) {
    throw handleGithubError(e);
  }
}
