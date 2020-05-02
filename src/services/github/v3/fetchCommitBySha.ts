import chalk from 'chalk';
import isEmpty from 'lodash.isempty';
import ora from 'ora';
import { BackportOptions } from '../../../options/options';
import { CommitSelected } from '../../../types/Commit';
import { HandledError } from '../../HandledError';
import { getFormattedCommitMessage, getShortSha } from '../commitFormatters';
import { apiRequestV3 } from './apiRequestV3';

export interface GithubCommit {
  commit: {
    message: string;
  };
  sha: string;
}

interface GithubSearch<T> {
  items: T[];
}

export async function fetchCommitBySha(
  options: BackportOptions & { sha: string }
): Promise<CommitSelected> {
  const {
    githubApiBaseUrlV3,
    repoName,
    repoOwner,
    sha,
    accessToken,
    username,
  } = options;

  const spinner = ora(`Loading commit "${getShortSha(sha)}"`).start();

  let res;
  try {
    res = await apiRequestV3<GithubSearch<GithubCommit>>({
      method: 'get',
      url: `${githubApiBaseUrlV3}/search/commits?q=hash:${sha}%20repo:${repoOwner}/${repoName}&per_page=1`,
      auth: {
        username: username,
        password: accessToken,
      },
      headers: {
        Accept: 'application/vnd.github.cloak-preview',
      },
    });

    spinner.stop();
  } catch (e) {
    spinner.fail();
    throw e;
  }

  // TODO: it should be possible to backport from other branches than master
  if (isEmpty(res.items)) {
    throw new HandledError(`No commit found on master with sha "${sha}"`);
  }

  const commitRes = res.items[0];
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
    selectedTargetBranches: [],
    formattedMessage,
    sha: fullSha,
  };
}
