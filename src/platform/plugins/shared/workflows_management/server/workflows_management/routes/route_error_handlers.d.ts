import type { KibanaResponseFactory } from '@kbn/core/server';
/**
 * Unified error handler for workflow management routes
 * @param response - The response object from the route handler
 * @param error - The error that occurred
 * @param options - Optional configuration for error handling
 * @returns Appropriate error response
 */
export declare function handleRouteError(response: KibanaResponseFactory, error: Error, options?: {
    checkNotFound?: boolean;
}): import("@kbn/core/server").IKibanaResponse<any>;
