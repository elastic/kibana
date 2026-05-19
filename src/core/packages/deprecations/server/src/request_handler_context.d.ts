import type { DomainDeprecationDetails } from '@kbn/core-deprecations-common';
/**
 * Server-side client that provides access to fetch all Kibana deprecations
 *
 * @public
 */
export interface DeprecationsClient {
    /**
     * Fetch all Kibana deprecations.
     */
    getAllDeprecations: () => Promise<DomainDeprecationDetails[]>;
}
/**
 * Core's `deprecations` request handler context.
 * @public
 */
export interface DeprecationsRequestHandlerContext {
    /**
     * {@link DeprecationsClient | Deprecations client} exposed in the request handler context.
     */
    client: DeprecationsClient;
}
