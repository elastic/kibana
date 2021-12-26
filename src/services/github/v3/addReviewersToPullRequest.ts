import { Octokit } from '@octokit/rest';
import ora from 'ora';
import { ValidConfigOptions } from '../../../options/options';
import { logger } from '../../logger';

export async function addReviewersToPullRequest(
  { githubApiBaseUrlV3, repoName, repoOwner, accessToken }: ValidConfigOptions,
  pullNumber: number,
  reviewers: string[]
) {
  const text = `Adding reviewers: ${reviewers}`;
  logger.info(text);
  const spinner = ora(text).start();

  try {
    const octokit = new Octokit({
      auth: accessToken,
      baseUrl: githubApiBaseUrlV3,
      log: logger,
    });

    await octokit.pulls.requestReviewers({
      owner: repoOwner,
      repo: repoName,
      pull_number: pullNumber,
      reviewers,
    });

    spinner.succeed();
  } catch (e) {
    const message = e.response?.data?.message;
    spinner.fail(`Adding reviewers. ${message ? message : ''}`);
    logger.info(`Could not add reviewers to PR ${pullNumber}`, e.stack);
  }
}
