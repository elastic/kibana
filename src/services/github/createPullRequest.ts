import axios, { AxiosResponse } from 'axios';
import { BackportOptions } from '../../options/options';
import { GithubIssue } from './GithubApiTypes';
import { handleGithubError } from './handleGithubError';
import { logger } from '../logger';

export async function createPullRequest(
  { apiHostname, repoName, repoOwner, accessToken, username }: BackportOptions,
  payload: {
    title: string;
    body: string;
    head: string;
    base: string;
  }
) {
  logger.info(
    `Creating PR with title: "${payload.title}". ${payload.head} -> ${payload.base}`
  );

  try {
    const res: AxiosResponse<GithubIssue> = await axios.post(
      `https://${apiHostname}/repos/${repoOwner}/${repoName}/pulls`,
      payload,
      {
        auth: {
          username: username,
          password: accessToken
        }
      }
    );
    return {
      html_url: res.data.html_url,
      number: res.data.number
    };
  } catch (e) {
    throw handleGithubError(e);
  }
}
