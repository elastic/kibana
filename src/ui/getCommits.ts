import chalk from 'chalk';
import { ValidConfigOptions } from '../options/options';
import { HandledError } from '../services/HandledError';
import { getFirstLine, getShortSha } from '../services/github/commitFormatters';
import { fetchCommitByPullNumber } from '../services/github/v4/fetchCommits/fetchCommitByPullNumber';
import { fetchCommitBySha } from '../services/github/v4/fetchCommits/fetchCommitBySha';
import { fetchCommitsByAuthor } from '../services/github/v4/fetchCommits/fetchCommitsByAuthor';
import { fetchPullRequestsBySearchQuery } from '../services/github/v4/fetchCommits/fetchPullRequestsBySearchQuery';
import { promptForCommits } from '../services/prompts';
import { ora } from './ora';

function getOraPersistsOption(question: string, answer: string) {
  return {
    symbol: chalk.green('?'),
    text: `${chalk.bold(question)} ${chalk.cyan(answer)}`,
  };
}

export async function getCommits(options: ValidConfigOptions) {
  const spinner = ora(options.ci).start();

  try {
    if (options.sha) {
      const shas = Array.isArray(options.sha) ? options.sha : [options.sha];

      // TODO: use Intl.ListFormat to format the sha's
      spinner.text = `Loading commit "${shas.map(getShortSha)}"`;

      const commits = await Promise.all(
        shas.map((sha) => fetchCommitBySha({ ...options, sha }))
      );

      spinner.stopAndPersist(
        getOraPersistsOption(
          'Select commit',
          commits.map((commit) => commit.sourceCommit.message).join(', ')
        )
      );

      return commits;
    }

    if (options.pullNumber) {
      spinner.text = `Loading pull request #${options.pullNumber}`;
      const commit = await fetchCommitByPullNumber({
        ...options,
        pullNumber: options.pullNumber, // must extract pullNumber to satisfy the ts gods
      });

      // add styles to make it look like a prompt question
      spinner.stopAndPersist(
        getOraPersistsOption(
          'Select pull request',
          getFirstLine(commit.sourceCommit.message)
        )
      );

      return [commit];
    }

    if (options.ci && !options.ls) {
      throw new HandledError(
        'When "--ci" flag is enabled either `--sha` or `--pr` must be specified'
      );
    }

    spinner.text = options.prFilter
      ? 'Loading pull requests...'
      : `Loading commits from branch "${options.sourceBranch}"...`;

    const commitChoices = options.prFilter
      ? await fetchPullRequestsBySearchQuery({
          ...options,
          prFilter: options.prFilter,
        })
      : await fetchCommitsByAuthor(options);
    spinner.stop();

    if (options.ls) {
      return commitChoices;
    }

    return promptForCommits({
      commitChoices,
      isMultipleChoice: options.multipleCommits,
      showDetails: options.details,
    });
  } catch (e) {
    if (options.ls) {
      spinner.stop();
    } else {
      spinner.fail();
    }
    throw e;
  }
}
