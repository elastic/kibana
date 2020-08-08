import { Octokit } from '@octokit/rest';
import chalk from 'chalk';
import ora from 'ora';
import { BackportOptions } from '../../../options/options';
import { CommitSelected } from '../../../types/Commit';
import { HandledError } from '../../HandledError';
import { getFullBackportBranch } from '../../git';
import { logger, consoleLog } from '../../logger';
import { fetchExistingPullRequest } from '../v4/fetchExistingPullRequest';
import { getGithubV3ErrorMessage } from './getGithubV3ErrorMessage';

export async function createPullRequest({
  options,
  commits,
  targetBranch,
  backportBranch,
}: {
  options: BackportOptions;
  commits: CommitSelected[];
  targetBranch: string;
  backportBranch: string;
}) {
  const title = getTitle({ options, commits, targetBranch });
  const body = getBody({ options, commits, targetBranch });
  const head = getFullBackportBranch(options, backportBranch);
  const base = targetBranch;
  logger.info(`Creating PR with title: "${title}". ${head} -> ${base}`);

  const {
    accessToken,
    dryRun,
    githubApiBaseUrlV3,
    repoName,
    repoOwner,
  } = options;
  const spinner = ora(`Creating pull request`).start();

  if (dryRun) {
    spinner.succeed('Dry run: Creating pull request');

    // output PR summary
    consoleLog(chalk.bold('\nPull request summary:'));
    consoleLog(`Branch: ${head} -> ${base}`);
    consoleLog(`Title: ${title}`);
    consoleLog(`Body: ${body}\n`);

    return { html_url: 'example_url', number: 1337 };
  }

  try {
    const octokit = new Octokit({
      auth: accessToken,
      baseUrl: githubApiBaseUrlV3,
      log: logger,
    });

    const res = await octokit.pulls.create({
      owner: repoOwner,
      repo: repoName,
      title,
      head: head,
      base: base,
      body: body,
    });

    spinner.succeed();

    return {
      html_url: res.data.html_url,
      number: res.data.number,
    };
  } catch (e) {
    // retrieve url for existing
    try {
      const existingPR = await fetchExistingPullRequest({
        options,
        targetBranch,
        backportBranch,
      });

      if (existingPR) {
        spinner.succeed('Updating existing pull request');
        return existingPR;
      }
    } catch (e) {
      logger.warn('Could not retrieve existing pull request', e);
      // swallow error
    }

    spinner.fail();
    throw new HandledError(
      `Could not create pull request: ${getGithubV3ErrorMessage(e)}`
    );
  }
}

function getBody({
  options,
  commits,
  targetBranch,
}: {
  options: BackportOptions;
  commits: CommitSelected[];
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

function getTitle({
  options,
  targetBranch,
  commits,
}: {
  options: BackportOptions;
  targetBranch: string;
  commits: CommitSelected[];
}) {
  const commitMessages = commits
    .map((commit) => commit.formattedMessage)
    .join(' | ');
  return options.prTitle
    .replace('{targetBranch}', targetBranch)
    .replace('{commitMessages}', commitMessages)
    .slice(0, 240);
}
