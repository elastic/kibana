import { Octokit } from '@octokit/rest';
import chalk from 'chalk';
import ora from 'ora';
import { ValidConfigOptions } from '../../../options/options';
import { Commit } from '../../../types/Commit';
import { HandledError } from '../../HandledError';
import { logger, consoleLog } from '../../logger';
import { enablePullRequestAutoMerge } from '../v4/enablePullRequestAutoMerge';
import { fetchExistingPullRequest } from '../v4/fetchExistingPullRequest';
import { getGithubV3ErrorMessage } from './getGithubV3ErrorMessage';

export interface PullRequestPayload {
  owner: string;
  repo: string;
  title: string;
  body: string;
  head: string;
  base: string;
  [key: string]: unknown;
}

export async function createPullRequest({
  options,
  prPayload,
}: {
  options: ValidConfigOptions;
  prPayload: PullRequestPayload;
}) {
  logger.info(
    `Creating PR with title: "${prPayload.title}". ${prPayload.head} -> ${prPayload.base}`
  );

  const { accessToken, dryRun, githubApiBaseUrlV3, autoMerge } = options;
  const spinner = ora(`Creating pull request`).start();

  if (dryRun) {
    spinner.succeed('Dry run: Creating pull request');

    // output PR summary
    consoleLog(chalk.bold('\nPull request summary:'));
    consoleLog(`Branch: ${prPayload.head} -> ${prPayload.base}`);
    consoleLog(`Title: ${prPayload.title}`);
    consoleLog(`Body: ${prPayload.body}\n`);

    return { url: 'example_url', number: 1337 };
  }

  try {
    const octokit = new Octokit({
      auth: accessToken,
      baseUrl: githubApiBaseUrlV3,
      log: logger,
    });

    const res = await octokit.pulls.create(prPayload);

    if (autoMerge) {
      await enablePullRequestAutoMerge(options);
    }

    spinner.succeed();

    return {
      url: res.data.html_url,
      number: res.data.number,
    };
  } catch (e) {
    // retrieve url for existing
    try {
      const existingPR = await fetchExistingPullRequest({
        options,
        prPayload,
      });

      if (existingPR) {
        spinner.succeed('Updating existing pull request');
        return existingPR;
      }
    } catch (e) {
      logger.info('Could not retrieve existing pull request', e);
      // swallow error
    }

    spinner.fail();
    throw new HandledError(
      `Could not create pull request: ${getGithubV3ErrorMessage(e)}`
    );
  }
}

export function getBody({
  options,
  commits,
  targetBranch,
}: {
  options: ValidConfigOptions;
  commits: Commit[];
  targetBranch: string;
}) {
  const commitMessages = commits
    .map((commit) => ` - ${commit.formattedMessage}`)
    .join('\n');
  const bodySuffix = options.prDescription
    ? `\n\n${options.prDescription}`
    : '';
  return `Backports the following commits to ${targetBranch}:\n${commitMessages}${bodySuffix}`;
}

export function getTitle({
  options,
  commits,
  targetBranch,
}: {
  options: ValidConfigOptions;
  commits: Commit[];
  targetBranch: string;
}) {
  const commitMessages = commits
    .map((commit) => commit.formattedMessage)
    .join(' | ');
  return options.prTitle
    .replace('{targetBranch}', targetBranch)
    .replace('{commitMessages}', commitMessages)
    .slice(0, 240);
}
