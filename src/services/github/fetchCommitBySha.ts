import axios from 'axios';
import get from 'lodash.get';
import isEmpty from 'lodash.isempty';
import { BackportOptions } from '../../options/options';
import { HandledError } from '../HandledError';
import { CommitSelected } from './Commit';
import { GithubCommit, GithubIssue, GithubSearch } from './GithubApiTypes';
import { handleGithubError } from './handleGithubError';
import { withFormattedCommitMessage } from './commitFormatters';

export async function fetchCommitBySha(
  options: BackportOptions & { sha: string }
): Promise<CommitSelected> {
  const { apiHostname, repoName, repoOwner, sha, accessToken } = options;
  try {
    const res = await axios.get<GithubSearch<GithubCommit>>(
      `https://${apiHostname}/search/commits?q=hash:${sha}%20repo:${repoOwner}/${repoName}&per_page=1&access_token=${accessToken}`,
      {
        headers: {
          Accept: 'application/vnd.github.cloak-preview'
        }
      }
    );

    if (isEmpty(res.data.items)) {
      throw new HandledError(`No commit found on master with sha "${sha}"`);
    }

    const commitRes = res.data.items[0];
    const fullSha = commitRes.sha;
    const pullNumber = await fetchPullRequestNumberBySha(options, fullSha);

    return withFormattedCommitMessage({
      message: commitRes.commit.message,
      sha: fullSha,
      pullNumber
    });
  } catch (e) {
    throw handleGithubError(e);
  }
}

async function fetchPullRequestNumberBySha(
  { apiHostname, repoName, repoOwner, accessToken }: BackportOptions,
  commitSha: string
): Promise<number> {
  const res = await axios.get<GithubSearch<GithubIssue>>(
    `https://${apiHostname}/search/issues?q=repo:${repoOwner}/${repoName}+${commitSha}+base:master&access_token=${accessToken}`
  );
  return get(res.data.items[0], 'number');
}
