import { AxiosResponse } from 'axios';
import { HandledError } from '../../HandledError';
import { getGlobalConfigPath } from '../../env';
import { GithubV4Response } from './apiRequestV4';

export function throwOnInvalidAccessToken({
  repoOwner,
  repoName,
  errorResponse,
}: {
  repoOwner: string;
  repoName: string;
  errorResponse: AxiosResponse<GithubV4Response<null>>;
}) {
  type MaybeString = string | undefined;

  function getSSOAuthUrl(ssoHeader?: string) {
    const matches = ssoHeader?.match(/url=(.*)/);
    if (matches) {
      return matches[1];
    }
  }

  const statusCode = errorResponse.status;

  switch (statusCode) {
    case 200: {
      const repoNotFound = errorResponse.data.errors?.some(
        (error) => error.type === 'NOT_FOUND'
      );

      const grantedScopes: MaybeString =
        errorResponse.headers['x-oauth-scopes'];

      const requiredScopes: MaybeString =
        errorResponse.headers['x-accepted-oauth-scopes'];

      const ssoHeader: MaybeString = errorResponse.headers['x-github-sso'];

      if (repoNotFound) {
        // repo does not exist
        if (grantedScopes === requiredScopes) {
          throw new HandledError(
            `The repository "${repoOwner}/${repoName}" doesn't exist`
          );
        }

        // user does not have permissions
        throw new HandledError(
          `You do not have access to the repository "${repoOwner}/${repoName}". Please make sure your access token has the required scopes.\n\nRequired scopes: ${requiredScopes}\nAccess token scopes: ${grantedScopes}`
        );
      }

      const repoAccessForbidden = errorResponse.data.errors?.some(
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
  }
}
