import gql from 'graphql-tag';
import { maybe } from '../../../utils/maybe';
import { getRepoInfoFromGitRemotes } from '../../git';
import { logger } from '../../logger';
import { apiRequestV4, GithubV4Exception } from './apiRequestV4';

// This method should be used to get the origin owner (instead of a fork owner)
export async function getRepoOwnerAndNameFromGitRemotes({
  accessToken,
  githubApiBaseUrlV4,
  cwd,
}: {
  accessToken: string;
  githubApiBaseUrlV4?: string;
  cwd: string;
}): Promise<{ repoOwner?: string; repoName?: string }> {
  const remotes = await getRepoInfoFromGitRemotes({ cwd });
  const firstRemote = maybe(remotes[0]);

  if (!firstRemote) {
    return {};
  }

  try {
    const res = await apiRequestV4<RepoOwnerAndNameResponse>({
      githubApiBaseUrlV4,
      accessToken,
      query,
      variables: {
        repoOwner: firstRemote.repoOwner,
        repoName: firstRemote.repoName,
      },
    });

    return {
      repoName: res.repository.name,
      // get the original owner (not the fork owner)
      repoOwner: res.repository.isFork
        ? res.repository.parent.owner.login
        : res.repository.owner.login,
    };
  } catch (e) {
    if (e instanceof GithubV4Exception) {
      logger.error(e.message);
      return {};
    }
    throw e;
  }
}

export interface RepoOwnerAndNameResponse {
  repository:
    | {
        isFork: true;
        name: string;
        owner: { login: string };
        parent: {
          owner: { login: string };
        };
      }
    | {
        isFork: false;
        name: string;
        owner: { login: string };
        parent: null;
      };
}

const query = gql`
  query RepoOwnerAndName($repoOwner: String!, $repoName: String!) {
    repository(owner: $repoOwner, name: $repoName) {
      isFork
      name
      owner {
        login
      }
      parent {
        owner {
          login
        }
      }
    }
  }
`;
