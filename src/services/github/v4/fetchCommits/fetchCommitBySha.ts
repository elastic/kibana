import chalk from 'chalk';
import ora from 'ora';
import { ValidConfigOptions } from '../../../../options/options';
import { HandledError } from '../../../HandledError';
import {
  Commit,
  SourceCommitWithTargetPullRequest,
  sourceCommitWithTargetPullRequestFragment,
  parseSourceCommit,
} from '../../../sourceCommit';
import { getShortSha } from '../../commitFormatters';
import { apiRequestV4 } from '../apiRequestV4';

export async function fetchCommitBySha(
  options: ValidConfigOptions & { sha: string }
): Promise<Commit> {
  const {
    accessToken,
    githubApiBaseUrlV4,
    repoName,
    repoOwner,
    sha,
    sourceBranch,
  } = options;

  const query = /* GraphQL */ `
  query CommitsBySha($repoOwner: String!, $repoName: String!, $oid: String!) {
    repository(owner: $repoOwner, name: $repoName) {
      object(expression: $oid) {
        ...${sourceCommitWithTargetPullRequestFragment.name}
      }
    }
  }

    ${sourceCommitWithTargetPullRequestFragment.source}
  `;

  const spinner = ora(`Loading commit "${getShortSha(sha)}"`).start();

  let res: CommitsByShaResponse;
  try {
    res = await apiRequestV4<CommitsByShaResponse>({
      githubApiBaseUrlV4,
      accessToken,
      query,
      variables: {
        repoOwner,
        repoName,
        oid: sha,
      },
    });
    spinner.stop();
  } catch (e) {
    spinner.fail();
    throw e;
  }

  const sourceCommit = res.repository.object;
  if (!sourceCommit) {
    throw new HandledError(
      `No commit found on branch "${sourceBranch}" with sha "${sha}"`
    );
  }

  const commit = parseSourceCommit({ options, sourceCommit });

  spinner.stopAndPersist({
    symbol: chalk.green('?'),
    text: `${chalk.bold('Select commit')} ${chalk.cyan(
      commit.formattedMessage
    )}`,
  });

  return commit;
}

interface CommitsByShaResponse {
  repository: {
    object: SourceCommitWithTargetPullRequest | null;
  };
}
