import type { KibanaRequest, SecurityServiceStart } from '@kbn/core/server';
/**
 * Gets the authenticated user information from the request
 * @param request - The Kibana request object
 * @param security - The security service instance
 * @returns The username of the authenticated user or 'system' as fallback
 */
export declare function getAuthenticatedUser(request: KibanaRequest, security?: SecurityServiceStart): string;
/**
 * Gets detailed user information including profile data
 * @param request - The Kibana request object
 * @param security - The security service instance
 * @returns User information object
 */
export declare function getDetailedUserInfo(request: KibanaRequest, security?: SecurityServiceStart): Promise<{
    username: string;
    full_name?: string;
    email?: string;
    profile_uid?: string;
}>;
