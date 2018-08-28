import isEmpty from 'lodash.isempty';
import { setAccessToken } from '../lib/github';

import {
  getCommitsByPrompt,
  getCommitBySha,
  getBranchesByPrompt,
  doBackportVersions,
  handleErrors,
  maybeSetupRepo
} from './cliService';
import { BackportOptions, BranchChoice } from '../types/types';

export async function initSteps(options: BackportOptions) {
  const [owner, repoName] = options.upstream.split('/');
  setAccessToken(options.accessToken);

  try {
    const author = options.all ? null : options.username;
    const commits = options.sha
      ? [await getCommitBySha(owner, repoName, options.sha)]
      : await getCommitsByPrompt(
          owner,
          repoName,
          author,
          options.multipleCommits
        );

    const branches = !isEmpty(options.branches)
      ? (options.branches as string[])
      : await getBranchesByPrompt(
          options.branchChoices as BranchChoice[],
          options.multipleBranches
        );

    await maybeSetupRepo(owner, repoName, options.username);
    await doBackportVersions(
      owner,
      repoName,
      commits,
      branches,
      options.username,
      options.labels
    );
  } catch (e) {
    handleErrors(e);
  }
}
