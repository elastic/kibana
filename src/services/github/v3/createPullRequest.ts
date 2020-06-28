import chalk from 'chalk';
import ora from 'ora';
import { BackportOptions } from '../../../options/options';
import { CommitSelected } from '../../../types/Commit';
import { getFullBackportBranch } from '../../git';
import { logger, consoleLog } from '../../logger';
import { fetchExistingPullNumber } from '../v4/fetchExistingPullRequest';
import { apiRequestV3 } from './apiRequestV3';

interface GithubIssue {
  html_url: string;
  number: number;
}

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
  const payload = getPullRequestPayload({
    options,
    commits,
    targetBranch,
    backportBranch,
  });
  logger.info(
    `Creating PR with title: "${payload.title}". ${payload.head} -> ${payload.base}`
  );

  const {
    githubApiBaseUrlV3,
    repoName,
    repoOwner,
    accessToken,
    username,
    dryRun,
  } = options;
  const spinner = ora(`Creating pull request`).start();

  if (dryRun) {
    spinner.succeed('Dry run: Creating pull request');

    // output PR summary
    consoleLog(chalk.bold('\nPull request summary:'));
    consoleLog(`Branch: ${payload.head} -> ${payload.base}`);
    consoleLog(`Title: ${payload.title}`);
    consoleLog(`Body: ${payload.body}\n`);

    return { html_url: 'example_url', number: 1337 };
  }

  try {
    const res = await apiRequestV3<GithubIssue>({
      method: 'post',
      url: `${githubApiBaseUrlV3}/repos/${repoOwner}/${repoName}/pulls`,
      data: payload,
      auth: {
        username: username,
        password: accessToken,
      },
    });

    spinner.succeed();

    return {
      html_url: res.html_url,
      number: res.number,
    };
  } catch (e) {
    try {
      const existingPR = await fetchExistingPullNumber({
        options,
        targetBranch,
        backportBranch,
      });

      if (existingPR) {
        spinner.succeed('Updating existing pull request');
        return existingPR;
      }
    } catch (e) {
      spinner.fail();
    }

    spinner.fail();
    throw e;
  }
}

function getPullRequestPayload({
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
  const { prDescription, prTitle } = options;
  const commitMessages = commits
    .map((commit) => ` - ${commit.formattedMessage}`)
    .join('\n');
  const bodySuffix = prDescription ? `\n\n${prDescription}` : '';

  return {
    title: getPullRequestTitle(targetBranch, commits, prTitle),
    body: `Backports the following commits to ${targetBranch}:\n${commitMessages}${bodySuffix}`,
    head: getFullBackportBranch(options, backportBranch),
    base: targetBranch,
  };
}

function getPullRequestTitle(
  targetBranch: string,
  commits: CommitSelected[],
  prTitle: string
) {
  const commitMessages = commits
    .map((commit) => commit.formattedMessage)
    .join(' | ');
  return prTitle
    .replace('{targetBranch}', targetBranch)
    .replace('{commitMessages}', commitMessages)
    .slice(0, 240);
}
