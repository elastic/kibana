import axios from 'axios';
import get from 'lodash.get';
import { HandledError } from '../HandledError';
import { GithubApiError } from './GithubApiTypes';
import { validateRequiredOptions } from '../../options/options';

function getSSOAuthUrl(error: GithubApiError) {
  const githubSSO: string | undefined = get(
    error,
    'response.headers["x-github-sso"]'
  );
  if (githubSSO) {
    return get(githubSSO.match(/url=(.*)/), '1');
  }
}

export async function verifyAccessToken({
  username,
  accessToken,
  apiHostname,
  repoName,
  repoOwner
}: ReturnType<typeof validateRequiredOptions>) {
  try {
    return await axios.head(
      `https://${apiHostname}/repos/${repoOwner}/${repoName}`,
      {
        auth: {
          username: username,
          password: accessToken
        }
      }
    );
  } catch (e) {
    const error = e as GithubApiError;
    const statusCode = error.response && error.response.status;

    const grantedScopes = get(error, 'response.headers["x-oauth-scopes"]');
    const requiredScopes = get(
      error,
      'response.headers["x-accepted-oauth-scopes"]'
    );

    switch (statusCode) {
      case 401:
        throw new HandledError(
          `Please check your access token and make sure it is valid`
        );

      case 403: {
        const ssoAuthUrl = getSSOAuthUrl(error);
        if (ssoAuthUrl) {
          throw new HandledError(
            `Please follow the link to authorize your personal access token with SSO:\n\n${ssoAuthUrl}`
          );
        }

        throw new HandledError(
          `Error while verifying access token: ${e.message}`
        );
      }

      case 404:
        if (grantedScopes === requiredScopes) {
          throw new HandledError(
            `The repository "${repoOwner}/${repoName}" doesn't exist`
          );
        }

        throw new HandledError(
          `You do not have access to the repository "${repoOwner}/${repoName}". Please make sure your access token has the required scopes.\n\nRequired scopes: ${requiredScopes}\nAccess token scopes: ${grantedScopes}`
        );
      default:
        throw new HandledError(
          `Error while verifying access token: ${e.message}`
        );
    }
  }
}
