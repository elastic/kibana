import { Octokit } from '@octokit/rest';
import { BackportResponse } from '../../../main';
import { ValidConfigOptions } from '../../../options/options';
import { logger, redactAccessToken } from '../../logger';
import { getFirstLine, getShortSha } from '../commitFormatters';

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
  const backportPRCommand = `To backport manually run: \`node scripts/backport --pr ${pullNumber}\`.\nFor more info read the [Backport documentation](https://github.com/sqren/backport#backport)`;

  if (backportResponse.status === 'failure') {
    return `## 💔 Backport failed
The pull request could not be backported due to the following error:
\`${backportResponse.errorMessage}\`

${backportPRCommand}
`;
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
        const conflictMessage = result.error.meta.commitsWithoutBackports.map(
          (c) => {
            if (c.commit.pullNumber) {
              return ` - [#${c.commit.pullNumber}](${c.commit.pullUrl})`;
            }

            return ` - ${getFirstLine(c.commit.originalMessage)} (${getShortSha(
              c.commit.sha
            )})`;
          }
        );

        return [
          '❌',
          result.targetBranch,
          `Could not backport due to conflicts, possibly caused by the following unbackported commits:<br>${conflictMessage.join(
            '<br>'
          )}`,
        ];
      }

      return ['❌', result.targetBranch, result.errorMessage];
    })
    .map((line) => line.join('|'))
    .join('|\n|');

  const table = backportResponse.results.length
    ? `| Status | Branch | Result |\n|:------:|:------:|:------:|\n|${tableBody}|`
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
      ? 'Note: Successful backport PRs will be merged automatically after passing CI.\n'
      : '';

  const backportPRCommandMessage = !didAllBackportsSucceed
    ? `${backportPRCommand}\n\n`
    : '';

  return redactAccessToken(
    `${header}\n\n${table}\n\n${backportPRCommandMessage}${autoMergeMessage}`
  );
}
