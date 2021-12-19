import chalk from 'chalk';
import ora from 'ora';
import { ValidConfigOptions } from '../options/options';
import { HandledError } from '../services/HandledError';
import { getShortSha } from '../services/github/commitFormatters';
import { fetchCommitByPullNumber } from '../services/github/v4/fetchCommits/fetchCommitByPullNumber';
import { fetchCommitBySha } from '../services/github/v4/fetchCommits/fetchCommitBySha';
import { fetchCommitsByAuthor } from '../services/github/v4/fetchCommits/fetchCommitsByAuthor';
import { fetchPullRequestBySearchQuery } from '../services/github/v4/fetchCommits/fetchPullRequestBySearchQuery';
import { promptForCommits } from '../services/prompts';

function getOraPersistsOption(question: string, answer: string) {
  return {
    symbol: chalk.green('?'),
    text: `${chalk.bold(question)} ${chalk.cyan(answer)}`,
  };
}

export async function getCommits(options: ValidConfigOptions) {
  const spinner = ora().start();

  try {
    if (options.sha) {
      spinner.text = `Loading commit "${getShortSha(options.sha)}"`;
      const commit = await fetchCommitBySha({ ...options, sha: options.sha });
      spinner.stopAndPersist(
        getOraPersistsOption('Select commit', commit.originalMessage)
      );
      return [commit];
    }

    if (options.pullNumber) {
      spinner.text = `Loading pull request #${options.pullNumber}`;
      const commit = await fetchCommitByPullNumber({
        ...options,
        pullNumber: options.pullNumber, // must extract pullNumber to satisfy the ts gods
      });

      // add styles to make it look like a prompt question
      spinner.stopAndPersist(
        getOraPersistsOption('Select pull request', commit.originalMessage)
      );

      return [commit];
    }

    if (options.ci) {
      throw new HandledError(
        'When "--ci" flag is enabled either `--sha` or `--pr` must be specified'
      );
    }

    if (options.prFilter) {
      spinner.text = 'Loading pull requests...';
      const commitChoices = await fetchPullRequestBySearchQuery(options);
      spinner.stop();
      return promptForCommits({
        commitChoices,
        isMultipleChoice: options.multipleCommits,
        showDetails: options.details,
      });
    }

    spinner.text = `Loading commits from branch "${options.sourceBranch}"...`;
    const commitChoices = await fetchCommitsByAuthor(options);
    spinner.stop();
    return promptForCommits({
      commitChoices,
      isMultipleChoice: options.multipleCommits,
      showDetails: options.details,
    });
  } catch (e) {
    spinner.fail();
    throw e;
  }
}
