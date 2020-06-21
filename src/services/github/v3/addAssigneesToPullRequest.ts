import ora from 'ora';
import { BackportOptions } from '../../../options/options';
import { logger } from '../../logger';
import { apiRequestV3 } from './apiRequestV3';

export async function addAssigneesToPullRequest(
  {
    githubApiBaseUrlV3,
    repoName,
    repoOwner,
    accessToken,
    username,
    dryRun,
  }: BackportOptions,
  pullNumber: number,
  assignees: string[]
): Promise<void> {
  const isSelfAssigning = assignees.length === 1 && assignees[0] === username;

  const text = isSelfAssigning
    ? `Self-assigning to #${pullNumber}`
    : `Adding assignees to #${pullNumber}: ${assignees.join(', ')}`;
  logger.info(text);
  const spinner = ora(text).start();

  try {
    if (dryRun) {
      spinner.succeed(`Dry run: ${text}`);
      return;
    }

    await apiRequestV3({
      method: 'post',
      url: `${githubApiBaseUrlV3}/repos/${repoOwner}/${repoName}/issues/${pullNumber}/assignees`,
      data: { assignees },
      auth: {
        username: username,
        password: accessToken,
      },
    });
    spinner.succeed();
  } catch (e) {
    spinner.fail();
    logger.info(`Could not add assignees to PR ${pullNumber}`, e.stack);
  }
}
