import { isEmpty, difference } from 'lodash';
import { maybe } from '../../../utils/maybe';
import { HandledError } from '../../HandledError';
import { getGlobalConfigPath } from '../../env';
import { GithubV4Exception } from './apiRequestV4';

export function throwOnInvalidAccessToken({
  error,
  repoOwner,
  repoName,
}: {
  error: GithubV4Exception<unknown>;
  repoOwner: string;
  repoName: string;
}) {
  function getSSOAuthUrl(ssoHeader?: string) {
    const matches = ssoHeader?.match(/url=(.*)/);
    if (matches) {
      return matches[1];
    }
  }

  const statusCode = error.githubResponse.status;

  switch (statusCode) {
    case 200: {
      const repoNotFound = error.githubResponse.data.errors?.some(
        (error) =>
          error.type === 'NOT_FOUND' && error.path?.join('.') === 'repository'
      );

      const grantedScopes =
        error.githubResponse.headers['x-oauth-scopes'] || '';
      const requiredScopes =
        error.githubResponse.headers['x-accepted-oauth-scopes'] || '';
      const ssoHeader = maybe(error.githubResponse.headers['x-github-sso']);

      if (repoNotFound) {
        const hasRequiredScopes = isEmpty(
          difference(requiredScopes.split(','), grantedScopes.split(','))
        );

        // user does not have permission to the repo
        if (!hasRequiredScopes) {
          throw new HandledError(
            `You do not have access to the repository "${repoOwner}/${repoName}". Please make sure your access token has the required scopes.\n\nRequired scopes: ${requiredScopes}\nAccess token scopes: ${grantedScopes}`
          );
        }

        // repo does not exist
        throw new HandledError(
          `The repository "${repoOwner}/${repoName}" doesn't exist`
        );
      }

      const repoAccessForbidden = error.githubResponse.data.errors?.some(
        (error) => error.type === 'FORBIDDEN'
      );

      const ssoAuthUrl = getSSOAuthUrl(ssoHeader);

      // user does not have permissions
      if (repoAccessForbidden && ssoAuthUrl) {
        throw new HandledError(
          `Please follow the link to authorize your personal access token with SSO:\n\n${ssoAuthUrl}`
        );
      }
      break;
    }

    case 401:
      throw new HandledError(
        `Please check your access token and make sure it is valid.\nConfig: ${getGlobalConfigPath()}`
      );

    default:
      return undefined;
  }
}
