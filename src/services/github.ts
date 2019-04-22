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
import { getPullRequestPayload } from '../steps/doBackportVersions';

export interface Commit {
  sha: string;
  message: string;
  pullNumber?: number;
}

let accessToken: string;
function getCommitMessage(message: string) {
  return message.split('\n')[0].trim();
}

export async function fetchCommitsByAuthor(
  owner: string,
  repoName: string,
  author: string | null
): Promise<Commit[]> {
  const query: GithubQuery = {
    access_token: accessToken,
    per_page: 10
  };

  if (author) {
    query.author = author;
    query.per_page = 5;
  }

  try {
    const res: AxiosResponse<GithubCommit[]> = await axios(
      `https://api.github.com/repos/${owner}/${repoName}/commits?${querystring.stringify(
        query
      )}`
    );

    const promises = res.data.map(async commit => {
      const sha = commit.sha;
      return {
        message: getCommitMessage(commit.commit.message),
        sha,
        pullNumber: await fetchPullRequestNumberBySha(owner, repoName, sha)
      };
    });

    return Promise.all(promises);
  } catch (e) {
    throw getError(e);
  }
}

export async function fetchCommitBySha(
  owner: string,
  repoName: string,
  sha: string
): Promise<Commit> {
  try {
    const res: AxiosResponse<GithubSearch<GithubCommit>> = await axios(
      `https://api.github.com/search/commits?q=hash:${sha}%20repo:${owner}/${repoName}&per_page=1&access_token=${accessToken}`,
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
    const pullNumber = await fetchPullRequestNumberBySha(
      owner,
      repoName,
      fullSha
    );

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
  owner: string,
  repoName: string,
  commitSha: string
): Promise<number> {
  try {
    const res: AxiosResponse<GithubSearch<GithubIssue>> = await axios(
      `https://api.github.com/search/issues?q=repo:${owner}/${repoName}+${commitSha}+base:master&access_token=${accessToken}`
    );
    return get(res.data.items[0], 'number');
  } catch (e) {
    throw getError(e);
  }
}

export async function createPullRequest(
  owner: string,
  repoName: string,
  payload: ReturnType<typeof getPullRequestPayload>
) {
  try {
    const res: AxiosResponse<GithubIssue> = await axios.post(
      `https://api.github.com/repos/${owner}/${repoName}/pulls?access_token=${accessToken}`,
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
  owner: string,
  repoName: string,
  pullNumber: number,
  labels: string[]
) {
  try {
    return await axios.post(
      `https://api.github.com/repos/${owner}/${repoName}/issues/${pullNumber}/labels?access_token=${accessToken}`,
      labels
    );
  } catch (e) {
    throw getError(e);
  }
}

export function setAccessToken(token: string) {
  accessToken = token;
}

function getError(e: GithubApiError) {
  if (e.response && e.response.data) {
    return new HandledError(
      JSON.stringify({ ...e.response.data, axiosUrl: e.config.url }, null, 4)
    );
  }

  return e;
}
