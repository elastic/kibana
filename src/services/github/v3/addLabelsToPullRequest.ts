import { BackportOptions } from '../../../options/options';
import { logger } from '../../logger';
import { apiRequestV3 } from './apiRequestV3';

export async function addLabelsToPullRequest(
  {
    githubApiBaseUrlV3,
    repoName,
    repoOwner,
    accessToken,
    username,
  }: BackportOptions,
  pullNumber: number,
  labels: string[]
) {
  logger.info(`Adding label "${labels}" to #${pullNumber}`);

  return apiRequestV3({
    method: 'post',
    url: `${githubApiBaseUrlV3}/repos/${repoOwner}/${repoName}/issues/${pullNumber}/labels`,
    data: labels,
    auth: {
      username: username,
      password: accessToken,
    },
  });
}
