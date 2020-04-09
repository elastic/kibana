import { BackportOptions } from '../../../options/options';
import { logger } from '../../logger';
import { apiRequestV3 } from './apiRequestV3';

interface GithubIssue {
  html_url: string;
  number: number;
}

export async function createPullRequest(
  {
    githubApiBaseUrlV3,
    repoName,
    repoOwner,
    accessToken,
    username,
  }: BackportOptions,
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
  const res = await apiRequestV3<GithubIssue>({
    method: 'post',
    url: `${githubApiBaseUrlV3}/repos/${repoOwner}/${repoName}/pulls`,
    data: payload,
    auth: {
      username: username,
      password: accessToken,
    },
  });

  return {
    html_url: res.html_url,
    number: res.number,
  };
}
