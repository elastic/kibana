import type { KibanaRequest } from '@kbn/core-http-server';
import type { AuthenticatedUser } from '@kbn/core-security-common';
import type { APIKeysType } from './authentication';
/**
 * Core's authentication service
 *
 * @public
 */
export interface CoreAuthenticationService {
    /**
     * Retrieve the user bound to the provided request, or null if
     * no user is authenticated.
     *
     * @param request The request to retrieve the authenticated user for.
     */
    getCurrentUser(request: KibanaRequest): AuthenticatedUser | null;
    /**
     * Retrieve the redacted session ID for the provided request.
     * Returns a redacted form of the session ID (e.g. last N characters).
     * Returns undefined if no session exists for the request.
     *
     * @param request The request to retrieve the session ID for.
     */
    getRedactedSessionId(request: KibanaRequest): Promise<string | undefined>;
    apiKeys: APIKeysType;
}
