import type { AuthenticatedUser } from '@kbn/core-security-common';
/**
 * Core's authentication service
 *
 * @public
 */
export interface CoreAuthenticationService {
    /**
     * Returns currently authenticated user
     * and throws if current user isn't authenticated.
     */
    getCurrentUser(): Promise<AuthenticatedUser>;
}
