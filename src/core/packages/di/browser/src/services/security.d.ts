import type { AuthenticatedUser } from '@kbn/core-security-common';
import type { ServiceToken } from '@kbn/core-di';
/**
 * The currently authenticated user.
 *
 * This binding resolves asynchronously (via `CoreAuthenticationService.getCurrentUser`)
 * and should be consumed with `container.getAsync` or within an asynchronous resolution chain.
 * @public
 */
export declare const CurrentUser: ServiceToken<AuthenticatedUser>;
