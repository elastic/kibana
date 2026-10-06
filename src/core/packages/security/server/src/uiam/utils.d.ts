import { HTTPAuthorizationHeader } from '../authentication';
/**
 * Checks if the given authorization credentials are UIAM credentials.
 *
 * @param credential The HTTP authorization header or access token to check.
 * @returns True if the credentials start with UIAM_CREDENTIALS_PREFIX, false otherwise.
 */
export declare function isUiamCredential(credential: HTTPAuthorizationHeader | string): boolean;
/**
 * Checks if the given authorization header carries a UIAM bearer token (`Bearer essu_...`), as
 * opposed to a UIAM API key or a non-UIAM credential.
 *
 * @param credential The HTTP authorization header to check.
 * @returns True if the header uses the `Bearer` scheme with UIAM credentials, false otherwise.
 */
export declare function isUiamBearerCredential(credential: HTTPAuthorizationHeader): boolean;
