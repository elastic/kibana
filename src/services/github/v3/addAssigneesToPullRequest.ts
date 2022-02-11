import { Octokit } from '@octokit/rest';
import { ValidConfigOptions } from '../../../options/options';
import { ora } from '../../../ui/ora';
import { logger } from '../../logger';

export async function addAssigneesToPullRequest(
  {
    githubApiBaseUrlV3,
    repoName,
    repoOwner,
    accessToken,
    autoAssign,
    ci,
  }: ValidConfigOptions,
  pullNumber: number,
  assignees: string[]
) {
  const text = autoAssign
    ? `Self-assigning to #${pullNumber}`
    : `Adding assignees to #${pullNumber}: ${assignees.join(', ')}`;
  logger.info(text);
  const spinner = ora(ci, text).start();

  try {
    const octokit = new Octokit({
      auth: accessToken,
      baseUrl: githubApiBaseUrlV3,
      log: logger,
    });

    await octokit.issues.addAssignees({
      owner: repoOwner,
      repo: repoName,
      issue_number: pullNumber,
      assignees: assignees,
    });

    spinner.succeed();
  } catch (e) {
    spinner.fail();
    logger.info(`Could not add assignees to PR ${pullNumber}`, e.stack);
  }
}
