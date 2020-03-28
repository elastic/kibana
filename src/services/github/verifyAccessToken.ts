import axios from 'axios';
import { HandledError } from '../HandledError';
import { GithubApiError } from './GithubApiTypes';
import { validateRequiredOptions } from '../../options/options';

type MaybeString = string | undefined;

function getSSOAuthUrl(ssoHeader?: string) {
  const matches = ssoHeader?.match(/url=(.*)/);
  if (matches) {
    return matches[1];
  }
}

export async function verifyAccessToken({
  username,
  accessToken,
  githubApiBaseUrlV3,
  repoName,
  repoOwner,
}: ReturnType<typeof validateRequiredOptions>) {
  try {
    return await axios.head(
      `${githubApiBaseUrlV3}/repos/${repoOwner}/${repoName}`,
      {
        auth: {
          username: username,
          password: accessToken,
        },
      }
    );
  } catch (e) {
    const error = e as GithubApiError;
    const statusCode = error.response?.status;

    const grantedScopes: MaybeString =
      error.response?.headers['x-oauth-scopes'];

    const requiredScopes: MaybeString =
      error.response?.headers['x-accepted-oauth-scopes'];

    const ssoHeader: MaybeString = error.response?.headers['x-github-sso'];

    switch (statusCode) {
      case 401:
        throw new HandledError(
          `Please check your access token and make sure it is valid`
        );

      case 403: {
        const ssoAuthUrl = getSSOAuthUrl(ssoHeader);
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
