import ora from 'ora';
import { ValidConfigOptions } from '../../../options/options';
import { logger } from '../../logger';
import { fetchPullRequestId } from './FetchPullRequestId';
import { apiRequestV4 } from './apiRequestV4';

export interface PullRequestAutoMergeResponse {
  enablePullRequestAutoMerge: { pullRequest?: { number: number } };
}

export async function enablePullRequestAutoMerge(
  options: ValidConfigOptions,
  targetPullRequestNumber: number
) {
  const { accessToken, githubApiBaseUrlV4, autoMergeMethod } = options;
  const text = `Enabling auto merging via ${options.autoMergeMethod}`;
  logger.info(text);
  const spinner = ora(text).start();

  const pullRequestId = await fetchPullRequestId(
    options,
    targetPullRequestNumber
  );

  const query = /* GraphQL */ `
    mutation EnablePullRequestAutoMerge(
      $pullRequestId: ID!
      $mergeMethod: PullRequestMergeMethod!
    ) {
      enablePullRequestAutoMerge(
        input: { pullRequestId: $pullRequestId, mergeMethod: $mergeMethod }
      ) {
        pullRequest {
          number
        }
      }
    }
  `;

  try {
    const res = await apiRequestV4<PullRequestAutoMergeResponse>({
      githubApiBaseUrlV4,
      accessToken,
      query,
      variables: {
        pullRequestId,
        mergeMethod: autoMergeMethod.toUpperCase(),
      },
    });
    spinner.succeed();
    return res.enablePullRequestAutoMerge.pullRequest?.number;
  } catch (e) {
    if (e instanceof Error) {
      spinner.fail();
      logger.info(
        `Could not enable auto merging for ${targetPullRequestNumber}`,
        e.stack
      );
    }
  }
}
