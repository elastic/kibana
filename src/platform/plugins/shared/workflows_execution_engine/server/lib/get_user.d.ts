import type { IClusterClient, KibanaRequest, SecurityServiceStart } from '@kbn/core/server';
/**
 * Gets the authenticated user information from the request.
 * Handles both regular requests and fake requests (Task Manager contexts).
 *
 * @param request - The Kibana request object
 * @param security - Core's security service instance
 * @param clusterClient - Elasticsearch cluster client for fallback authentication with API keys
 * @returns Username when resolvable, otherwise `'unknown'`.
 * @remarks Always **resolves** with a string — does not throw or reject. Failures in auth lookup are
 *   swallowed so callers (e.g. audit metadata) cannot block core workflow actions.
 */
export declare function getAuthenticatedUser(request: KibanaRequest, security: SecurityServiceStart, clusterClient: IClusterClient): Promise<string>;
