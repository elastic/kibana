import { BackportOptions } from '../options/options';
import {
  fetchCommitBySha,
  fetchCommitsByAuthor,
  getShortSha
} from '../services/github';
import { promptForCommits } from '../services/prompts';
import isEmpty from 'lodash.isempty';
import ora = require('ora');

export async function getCommits(options: BackportOptions) {
  const [owner, repoName] = options.upstream.split('/');

  if (options.sha) {
    return [
      await getCommitBySha(owner, repoName, options.sha, options.apiHostname)
    ];
  }

  const author = options.all ? null : options.username;
  return await getCommitsByPrompt(
    owner,
    repoName,
    author,
    options.multipleCommits,
    options.apiHostname
  );
}

export async function getCommitBySha(
  owner: string,
  repoName: string,
  sha: string,
  apiHostname: string
) {
  const spinner = ora(`Loading commit "${getShortSha(sha)}"`).start();
  try {
    const commit = await fetchCommitBySha(owner, repoName, sha, apiHostname);
    spinner.stop();
    return commit;
  } catch (e) {
    spinner.fail();
    throw e;
  }
}

async function getCommitsByPrompt(
  owner: string,
  repoName: string,
  author: string | null,
  multipleCommits: boolean,
  apiHostname: string
) {
  const spinner = ora('Loading commits...').start();
  try {
    const commits = await fetchCommitsByAuthor(
      owner,
      repoName,
      author,
      apiHostname
    );
    if (isEmpty(commits)) {
      const warningText = author
        ? 'There are no commits by you in this repository'
        : 'There are no commits in this repository';

      spinner.fail(warningText);
      process.exit(1);
    }
    spinner.stop();
    return promptForCommits(commits, multipleCommits);
  } catch (e) {
    spinner.fail();
    throw e;
  }
}
