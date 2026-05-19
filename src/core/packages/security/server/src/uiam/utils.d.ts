import { HTTPAuthorizationHeader } from '../authentication';
/**
 * Checks if the given authorization credentials are UIAM credentials.
 *
 * @param credential The HTTP authorization header or access token to check.
 * @returns True if the credentials start with UIAM_CREDENTIALS_PREFIX, false otherwise.
 */
export declare function isUiamCredential(credential: HTTPAuthorizationHeader | string): boolean;
