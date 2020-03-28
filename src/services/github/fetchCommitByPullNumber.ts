import { BackportOptions } from '../../options/options';
import { CommitSelected } from './Commit';
import { getFormattedCommitMessage } from './commitFormatters';
import { gqlRequest } from './gqlRequest';
import { HandledError } from '../HandledError';

export async function fetchCommitByPullNumber(
  options: BackportOptions & { pullNumber: number }
): Promise<CommitSelected> {
  const {
    githubApiBaseUrlV4,
    repoName,
    repoOwner,
    pullNumber,
    accessToken,
  } = options;
  const query = /* GraphQL */ `
    query getCommitbyPullNumber(
      $repoOwner: String!
      $repoName: String!
      $pullNumber: Int!
    ) {
      repository(owner: $repoOwner, name: $repoName) {
        pullRequest(number: $pullNumber) {
          baseRef {
            name
          }
          mergeCommit {
            oid
            message
          }
        }
      }
    }
  `;

  const res = await gqlRequest<DataResponse>({
    githubApiBaseUrlV4,
    accessToken,
    query,
    variables: {
      repoOwner,
      repoName,
      pullNumber,
    },
  });

  if (res.repository.pullRequest.mergeCommit === null) {
    throw new HandledError(`The PR #${pullNumber} is not merged`);
  }

  const baseBranch = res.repository.pullRequest.baseRef.name;
  const sha = res.repository.pullRequest.mergeCommit.oid;
  const message = getFormattedCommitMessage({
    message: res.repository.pullRequest.mergeCommit.message,
    sha,
    pullNumber,
  });

  return {
    branch: baseBranch,
    sha,
    message,
    pullNumber,
  };
}

interface DataResponse {
  repository: {
    pullRequest: {
      baseRef: {
        name: string;
      };
      mergeCommit: {
        oid: string;
        message: string;
      } | null;
    };
  };
}
