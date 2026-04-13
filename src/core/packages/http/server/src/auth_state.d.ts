import type { KibanaRequest } from './router';
/**
 * Status indicating an outcome of the authentication.
 * @public
 */
export declare enum AuthStatus {
    /**
     * `auth` interceptor successfully authenticated a user
     */
    authenticated = "authenticated",
    /**
     * `auth` interceptor failed user authentication
     */
    unauthenticated = "unauthenticated",
    /**
     * `auth` interceptor has not been registered
     */
    unknown = "unknown"
}
/**
 * Gets authentication state for a request. Returned by `auth` interceptor.
 * @param request {@link KibanaRequest} - an incoming request.
 * @public
 */
export type GetAuthState = <T = unknown>(request: KibanaRequest) => {
    status: AuthStatus;
    state: T;
};
/**
 * Returns authentication status for a request.
 * @param request {@link KibanaRequest} - an incoming request.
 * @public
 */
export type IsAuthenticated = (request: KibanaRequest) => boolean;
