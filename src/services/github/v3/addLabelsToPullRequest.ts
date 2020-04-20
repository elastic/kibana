import ora from 'ora';
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
    dryRun,
  }: BackportOptions,
  pullNumber: number,
  labels: string[]
): Promise<void> {
  const text = `Adding labels to #${pullNumber}: ${labels.join(', ')}`;
  logger.info(text);
  const spinner = ora(text).start();

  if (dryRun) {
    spinner.succeed(`Dry run: ${text}`);
    return;
  }

  try {
    await apiRequestV3({
      method: 'post',
      url: `${githubApiBaseUrlV3}/repos/${repoOwner}/${repoName}/issues/${pullNumber}/labels`,
      data: labels,
      auth: {
        username: username,
        password: accessToken,
      },
    });
    spinner.succeed();
    return;
  } catch (e) {
    spinner.fail();
    throw e;
  }
}
