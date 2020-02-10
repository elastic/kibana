import axios from 'axios';
import isEmpty from 'lodash.isempty';
import { BackportOptions } from '../../options/options';
import { HandledError } from '../HandledError';
import { CommitSelected } from './Commit';
import { GithubCommit, GithubSearch } from './GithubApiTypes';
import { handleGithubError } from './handleGithubError';
import { getFormattedCommitMessage } from './commitFormatters';

export async function fetchCommitBySha(
  options: BackportOptions & { sha: string }
): Promise<CommitSelected> {
  const {
    apiHostname,
    repoName,
    repoOwner,
    sha,
    accessToken,
    username
  } = options;
  try {
    const res = await axios.get<GithubSearch<GithubCommit>>(
      `https://${apiHostname}/search/commits?q=hash:${sha}%20repo:${repoOwner}/${repoName}&per_page=1`,
      {
        auth: {
          username: username,
          password: accessToken
        },
        headers: {
          Accept: 'application/vnd.github.cloak-preview'
        }
      }
    );

    // TODO: it should be possible to backport from other branches than master
    if (isEmpty(res.data.items)) {
      throw new HandledError(`No commit found on master with sha "${sha}"`);
    }

    const commitRes = res.data.items[0];
    const fullSha = commitRes.sha;

    const message = getFormattedCommitMessage({
      message: commitRes.commit.message,
      sha: fullSha
    });

    return {
      branch: 'master',
      message,
      sha: fullSha
    };
  } catch (e) {
    throw handleGithubError(e);
  }
}
