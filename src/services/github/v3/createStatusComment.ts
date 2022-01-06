import { Octokit } from '@octokit/rest';
import { BackportResponse } from '../../../main';
import { ValidConfigOptions } from '../../../options/options';
import { logger, redactAccessToken } from '../../logger';
import { getFirstLine } from '../commitFormatters';

export async function createStatusComment({
  options,
  backportResponse,
}: {
  options: ValidConfigOptions;
  backportResponse: BackportResponse;
}): Promise<void> {
  const { githubApiBaseUrlV3, repoName, repoOwner, accessToken } = options;

  try {
    const octokit = new Octokit({
      auth: accessToken,
      baseUrl: githubApiBaseUrlV3,
      log: logger,
    });

    // don't post update if there are no new pull requests created
    if (backportResponse.status === 'success') {
      const hasOnlyUpdates = backportResponse.results.every(
        (result) => result.status === 'success' && result.didUpdate
      );

      if (hasOnlyUpdates) {
        return;
      }
    }

    await Promise.all(
      backportResponse.commits.map((commit) => {
        if (!commit.pullNumber) {
          return;
        }

        const body = getCommentBody({
          options,
          pullNumber: commit.pullNumber,
          backportResponse,
        });

        return octokit.issues.createComment({
          owner: repoOwner,
          repo: repoName,
          issue_number: commit.pullNumber,
          body,
        });
      })
    );
  } catch (e) {
    logger.info(`Could not create status comment `, e.stack);
  }
}

export function getCommentBody({
  options,
  pullNumber,
  backportResponse,
}: {
  options: ValidConfigOptions;
  pullNumber: number;
  backportResponse: BackportResponse;
}): string {
  const { repoName, repoOwner, autoMerge } = options;
  const backportPRCommand = `\n## How to fix\n\nRe-run the backport manually:\n\`\`\`\n${options.backportBinary} --pr ${pullNumber}\n\`\`\``;
  const supportSection =
    '\n\n### Questions ?\nPlease refer to the [Backport tool documentation](https://github.com/sqren/backport)';

  if (backportResponse.status === 'failure') {
    return `## 💔 Backport failed
The pull request could not be backported due to the following error:
\`${backportResponse.errorMessage}\`
${backportPRCommand}${supportSection}`;
  }

  const tableBody = backportResponse.results
    .map((result) => {
      if (result.status === 'success') {
        return [
          '✅',
          result.targetBranch,
          `[<img src="https://img.shields.io/github/pulls/detail/state/${repoOwner}/${repoName}/${result.pullRequestNumber}">](${result.pullRequestUrl})`,
        ];
      }

      if (result.error.meta?.type === 'commitsWithoutBackports') {
        const conflictingPullRequests =
          result.error.meta.commitsWithoutBackports.map((c) => {
            return ` - [${getFirstLine(c.commit.originalMessage)}](${
              c.commit.pullUrl
            })`;
          });

        const conflictSection = `<br><br>You might need to backport the following PRs to ${
          result.targetBranch
        }:<br>${conflictingPullRequests.join('<br>')}`;

        return [
          '❌',
          result.targetBranch,
          `**Backport failed because of merge conflicts**${
            conflictingPullRequests.length > 0 ? conflictSection : ''
          }`,
        ];
      }

      return ['❌', result.targetBranch, result.errorMessage];
    })
    .map((line) => line.join('|'))
    .join('|\n|');

  const table = backportResponse.results.length
    ? `| Status | Branch | Result |\n|:------:|:------:|:------|\n|${tableBody}|`
    : '';

  const didAllBackportsSucceed = backportResponse.results.every(
    (r) => r.status === 'success'
  );

  const didAnyBackportsSucceed = backportResponse.results.some(
    (r) => r.status === 'success'
  );

  const header = didAllBackportsSucceed
    ? '## 💚 All backports created successfully'
    : '## 💔 Some backports could not be created';

  const autoMergeMessage =
    autoMerge && didAnyBackportsSucceed
      ? '\nNote: Successful backport PRs will be merged automatically after passing CI.'
      : '';

  const backportPRCommandMessage = !didAllBackportsSucceed
    ? `${backportPRCommand}`
    : '';

  return redactAccessToken(
    `${header}\n\n${table}
${backportPRCommandMessage}${autoMergeMessage}${supportSection}`
  );
}
