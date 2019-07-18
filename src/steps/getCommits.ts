import isEmpty from 'lodash.isempty';
import { BackportOptions } from '../options/options';
import { promptForCommits } from '../services/prompts';
import ora = require('ora');
import { fetchCommitBySha } from '../services/github/fetchCommitBySha';
import { fetchCommitsByAuthor } from '../services/github/fetchCommitsByAuthor';
import { getShortSha } from '../services/github/commitFormatters';

export async function getCommits(options: BackportOptions) {
  if (options.sha) {
    return [await getCommitBySha({ ...options, sha: options.sha })]; // must extract sha to satisfy the ts gods
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

async function getCommitsByPrompt(options: BackportOptions) {
  const spinner = ora('Loading commits...').start();
  try {
    const commits = await fetchCommitsByAuthor(options);
    if (isEmpty(commits)) {
      const warningText = options.all
        ? 'There are no commits in this repository'
        : `There are no commits by "${options.author}" in this repository. Try with \`--all\` for commits by all users or \`--author=<username>\` for commits from a specific user`;

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
