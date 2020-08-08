import { Octokit } from '@octokit/rest';
import chalk from 'chalk';
import isEmpty from 'lodash.isempty';
import ora from 'ora';
import { BackportOptions } from '../../../options/options';
import { CommitSelected } from '../../../types/Commit';
import { HandledError } from '../../HandledError';
import { logger } from '../../logger';
import { getFormattedCommitMessage, getShortSha } from '../commitFormatters';
import { getGithubV3ErrorMessage } from './getGithubV3ErrorMessage';

export async function fetchCommitBySha(
  options: BackportOptions & { sha: string }
): Promise<CommitSelected> {
  const { githubApiBaseUrlV3, repoName, repoOwner, sha, accessToken } = options;

  const spinner = ora(`Loading commit "${getShortSha(sha)}"`).start();

  let res;
  try {
    const octokit = new Octokit({
      auth: accessToken,
      baseUrl: githubApiBaseUrlV3,
      log: logger,
    });

    res = await octokit.search.commits({
      per_page: 1,
      q: `hash:${sha} repo:${repoOwner}/${repoName}`,
    });

    spinner.stop();
  } catch (e) {
    spinner.fail();
    throw new HandledError(
      `Could not fetch commits: ${getGithubV3ErrorMessage(e)}`
    );
  }

  // TODO: it should be possible to backport from other branches than master
  if (isEmpty(res.data.items)) {
    throw new HandledError(`No commit found on master with sha "${sha}"`);
  }

  const commitRes = res.data.items[0];
  const fullSha = commitRes.sha;

  const formattedMessage = getFormattedCommitMessage({
    message: commitRes.commit.message,
    sha: fullSha,
  });

  // add styles to make it look like a prompt question
  spinner.stopAndPersist({
    symbol: chalk.green('?'),
    text: `${chalk.bold('Select commit')} ${chalk.cyan(formattedMessage)}`,
  });

  return {
    sourceBranch: 'master',
    targetBranchesFromLabels: [],
    formattedMessage,
    sha: fullSha,
  };
}
