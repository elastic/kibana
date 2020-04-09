import ora = require('ora');
import isEmpty from 'lodash.isempty';
import { BackportOptions } from '../options/options';
import { getShortSha } from '../services/github/commitFormatters';
import { fetchCommitBySha } from '../services/github/v3/fetchCommitBySha';
import { fetchCommitByPullNumber } from '../services/github/v4/fetchCommitByPullNumber';
import { fetchCommitsByAuthor } from '../services/github/v4/fetchCommitsByAuthor';
import { promptForCommits } from '../services/prompts';

export async function getCommits(options: BackportOptions) {
  if (options.sha) {
    return [await getCommitBySha({ ...options, sha: options.sha })]; // must extract sha to satisfy the ts gods
  }

  if (options.pullNumber) {
    return [
      await getCommitByPullNumber({
        ...options,
        pullNumber: options.pullNumber,
      }),
    ];
  }

  return await getCommitsByPrompt(options);
}

export async function getCommitBySha(
  options: BackportOptions & { sha: string } // sha is required
) {
  const spinner = ora(`Loading commit "${getShortSha(options.sha)}"`).start();
  try {
    const commit = await fetchCommitBySha(options);
    spinner.stop();
    return commit;
  } catch (e) {
    spinner.fail();
    throw e;
  }
}

export async function getCommitByPullNumber(
  options: BackportOptions & { pullNumber: number } // pullNumber is required
) {
  const spinner = ora(
    `Loading merge commit from pull request #${options.pullNumber}`
  ).start();
  try {
    const commit = await fetchCommitByPullNumber(options);
    spinner.stop();
    return commit;
  } catch (e) {
    spinner.fail();
    throw e;
  }
}

async function getCommitsByPrompt(options: BackportOptions) {
  const spinner = ora('Loading commits...').start();
  try {
    const commits = await fetchCommitsByAuthor(options);
    if (isEmpty(commits)) {
      const pathText = options.path
        ? ` touching files in path: "${options.path}"`
        : '';

      const warningText = options.all
        ? `There are no commits in this repository${pathText}`
        : `There are no commits by "${options.author}" in this repository${pathText}. Try with \`--all\` for commits by all users or \`--author=<username>\` for commits from a specific user`;

      spinner.fail(warningText);
      process.exit(1);
    }
    spinner.stop();
    return promptForCommits(commits, options.multipleCommits);
  } catch (e) {
    spinner.fail();
    throw e;
  }
}
