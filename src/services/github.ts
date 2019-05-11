import {
  GithubApiError,
  GithubCommit,
  GithubIssue,
  GithubQuery,
  GithubSearch
} from '../types/GithubApi';
import axios, { AxiosResponse } from 'axios';
import querystring from 'querystring';
import get from 'lodash.get';
import isEmpty from 'lodash.isempty';
import { HandledError } from './HandledError';
import { BackportOptions } from '../options/options';
import { getPullRequestPayload } from '../steps/doBackportVersions';

export interface Commit {
  sha: string;
  message: string;
  pullNumber?: number;
}

export function getShortSha(sha: string) {
  return sha.slice(0, 7);
}

function getCommitMessage(message: string) {
  return message.split('\n')[0].trim();
}

export async function fetchCommitsByAuthor(
  options: BackportOptions
): Promise<Commit[]> {
  const {
    accessToken,
    all,
    apiHostname,
    repoName,
    repoOwner,
    username
  } = options;

  const query: GithubQuery = {
    access_token: accessToken,
    per_page: 10
  };

  if (!all) {
    query.author = username;
    query.per_page = 5;
  }

  try {
    const res: AxiosResponse<GithubCommit[]> = await axios(
      `https://${apiHostname}/repos/${repoOwner}/${repoName}/commits?${querystring.stringify(
        query
      )}`
    );

    const promises = res.data.map(async commit => {
      const sha = commit.sha;
      const pullNumber = await fetchPullRequestNumberBySha(options, sha);
      const message = getCommitMessage(commit.commit.message);
      return { message, sha, pullNumber };
    });

    return Promise.all(promises);
  } catch (e) {
    throw getError(e);
  }
}

export async function fetchCommitBySha(
  options: BackportOptions & { sha: string }
): Promise<Commit> {
  const { apiHostname, repoName, repoOwner, sha, accessToken } = options;
  try {
    const res: AxiosResponse<GithubSearch<GithubCommit>> = await axios(
      `https://${apiHostname}/search/commits?q=hash:${sha}%20repo:${repoOwner}/${repoName}&per_page=1&access_token=${accessToken}`,
      {
        headers: {
          Accept: 'application/vnd.github.cloak-preview'
        }
      }
    );

    if (isEmpty(res.data.items)) {
      throw new HandledError(`No commit found for SHA: ${sha}`);
    }

    const commitRes = res.data.items[0];
    const fullSha = commitRes.sha;
    const pullNumber = await fetchPullRequestNumberBySha(options, fullSha);

    return {
      message: getCommitMessage(commitRes.commit.message),
      sha: fullSha,
      pullNumber
    };
  } catch (e) {
    throw getError(e);
  }
}

async function fetchPullRequestNumberBySha(
  { apiHostname, repoName, repoOwner, accessToken }: BackportOptions,
  commitSha: string
): Promise<number> {
  try {
    const res: AxiosResponse<GithubSearch<GithubIssue>> = await axios(
      `https://${apiHostname}/search/issues?q=repo:${repoOwner}/${repoName}+${commitSha}+base:master&access_token=${accessToken}`
    );
    return get(res.data.items[0], 'number');
  } catch (e) {
    throw getError(e);
  }
}

export async function createPullRequest(
  { apiHostname, repoName, repoOwner, accessToken }: BackportOptions,
  payload: ReturnType<typeof getPullRequestPayload>
) {
  try {
    const res: AxiosResponse<GithubIssue> = await axios.post(
      `https://${apiHostname}/repos/${repoOwner}/${repoName}/pulls?access_token=${accessToken}`,
      payload
    );
    return {
      html_url: res.data.html_url,
      number: res.data.number
    };
  } catch (e) {
    throw getError(e);
  }
}

export async function addLabelsToPullRequest(
  { apiHostname, repoName, repoOwner, labels, accessToken }: BackportOptions,
  pullNumber: number
) {
  try {
    return await axios.post(
      `https://${apiHostname}/repos/${repoOwner}/${repoName}/issues/${pullNumber}/labels?access_token=${accessToken}`,
      labels
    );
  } catch (e) {
    throw getError(e);
  }
}

export async function verifyAccessToken({
  accessToken,
  apiHostname,
  repoName,
  repoOwner
}: BackportOptions) {
  try {
    return await axios.head(
      `https://${apiHostname}/repos/${repoOwner}/${repoName}?access_token=${accessToken}`
    );
  } catch (e) {
    const error = e as GithubApiError;
    const statusCode = error.response && error.response.status;

    const grantedScopes = get(error, 'response.headers["x-oauth-scopes"]');
    const requiredScopes = get(
      error,
      'response.headers["x-accepted-oauth-scopes"]'
    );

    switch (statusCode) {
      case 401:
        throw new HandledError(
          `Please check your access token and make sure it is valid`
        );
      case 404:
        if (grantedScopes === requiredScopes) {
          throw new HandledError(
            `The repository "${repoOwner}/${repoName}" doesn't exist`
          );
        }

        throw new HandledError(
          `You do not have access to the repository "${repoOwner}/${repoName}". Please make sure your access token has the required scopes.\n\nRequired scopes: ${requiredScopes}\nAccess token scopes: ${grantedScopes}`
        );
      default:
        throw e.message;
    }
  }
}

function getError(e: GithubApiError) {
  if (e.response && e.response.data) {
    return new HandledError(
      JSON.stringify({ ...e.response.data, axiosUrl: e.config.url }, null, 4)
    );
  }

  return e;
}
