import {
  GithubQuery,
  GithubCommit,
  PullRequest,
  Commit,
  GithubIssue,
  GithubPullRequestPayload,
  GithubIssues,
  GithubApiError
} from '../types/types';

import axios, { AxiosResponse } from 'axios';
import querystring from 'querystring';
import get from 'lodash.get';
import { HandledError } from './errors';

let accessToken: string;
function getCommitMessage(message: string) {
  return message.split('\n')[0].trim();
}

export async function getCommits(
  owner: string,
  repoName: string,
  author: string | null
): Promise<Commit[]> {
  const query: GithubQuery = {
    access_token: accessToken,
    per_page: 20
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
        pullRequest: await getPullRequestBySha(owner, repoName, sha)
      };
    });

    return Promise.all(promises);
  } catch (e) {
    throw getError(e);
  }
}

export async function getCommit(
  owner: string,
  repoName: string,
  sha: string
): Promise<Commit> {
  try {
    const res: AxiosResponse<GithubCommit> = await axios(
      `https://api.github.com/repos/${owner}/${repoName}/commits/${sha}?access_token=${accessToken}`
    );
    const fullSha = res.data.sha;
    const pullRequest = await getPullRequestBySha(owner, repoName, fullSha);

    return {
      message: getCommitMessage(res.data.commit.message),
      sha: fullSha,
      pullRequest
    };
  } catch (e) {
    throw getError(e);
  }
}

export async function createPullRequest(
  owner: string,
  repoName: string,
  payload: GithubPullRequestPayload
): Promise<PullRequest> {
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

export async function addLabels(
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

async function getPullRequestBySha(
  owner: string,
  repoName: string,
  commitSha: string
): Promise<number> {
  try {
    const res: AxiosResponse<GithubIssues> = await axios(
      `https://api.github.com/search/issues?q=repo:${owner}/${repoName}+${commitSha}+base:master&access_token=${accessToken}`
    );
    return get(res.data.items[0], 'number');
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
