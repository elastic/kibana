import ora from 'ora';
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
    dryRun,
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

  const spinner = ora(`Creating pull request`).start();

  if (dryRun) {
    spinner.succeed();
    return { html_url: 'example_url', number: 1337 };
  }

  try {
    const res = await apiRequestV3<GithubIssue>({
      method: 'post',
      url: `${githubApiBaseUrlV3}/repos/${repoOwner}/${repoName}/pulls`,
      data: payload,
      auth: {
        username: username,
        password: accessToken,
      },
    });

    spinner.succeed();

    return {
      html_url: res.html_url,
      number: res.number,
    };
  } catch (e) {
    spinner.fail();
    throw e;
  }
}
