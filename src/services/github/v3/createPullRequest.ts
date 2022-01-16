import { Octokit } from '@octokit/rest';
import ora from 'ora';
import { ValidConfigOptions } from '../../../options/options';
import { HandledError } from '../../HandledError';
import { logger } from '../../logger';
import { Commit } from '../../sourceCommit/parseSourceCommit';
import { getFirstLine, getShortSha } from '../commitFormatters';
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
}): Promise<{
  url: string;
  number: number;
  didUpdate: boolean;
}> {
  logger.info(
    `Creating PR with title: "${prPayload.title}". ${prPayload.head} -> ${prPayload.base}`
  );

  const { accessToken, githubApiBaseUrlV3 } = options;
  const spinner = ora(`Creating pull request`).start();

  try {
    const octokit = new Octokit({
      auth: accessToken,
      baseUrl: githubApiBaseUrlV3,
      log: logger,
    });

    const res = await octokit.pulls.create(prPayload);

    spinner.succeed();

    return {
      url: res.data.html_url,
      number: res.data.number,
      didUpdate: false,
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
        return {
          url: existingPR.url,
          number: existingPR.number,
          didUpdate: true,
        };
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

export function getPullRequestBody({
  options,
  commits,
  targetBranch,
}: {
  options: ValidConfigOptions;
  commits: Commit[];
  targetBranch: string;
}) {
  const commitMessages = commits
    .map((c) => {
      const message = c.pullNumber
        ? `#${c.pullNumber}`
        : `${getFirstLine(c.originalMessage)} (${getShortSha(c.sha)})`;

      return ` - ${message}`;
    })
    .join('\n');

  const defaultPrDescription = `# Backport

This is an automatic backport to \`${targetBranch}\` of:
${commitMessages}

### Questions ?
Please refer to the [Backport tool documentation](https://github.com/sqren/backport)`;

  return (options.prDescription ?? defaultPrDescription)
    .replace('{targetBranch}', targetBranch)
    .replace('{commitMessages}', commitMessages)
    .replace('{defaultPrDescription}', defaultPrDescription);
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
    .map((commit) => getFirstLine(commit.originalMessage))
    .join(' | ');

  const defaultPrTitle = '[{targetBranch}] {commitMessages}';

  return (options.prTitle ?? defaultPrTitle)
    .replace('{targetBranch}', targetBranch)
    .replace('{commitMessages}', commitMessages)
    .slice(0, 240);
}
