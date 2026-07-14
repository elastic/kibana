import type { IScopedClusterClient } from './client';
/**
 * Core's `elasticsearch` request handler context.
 * @public
 */
export interface ElasticsearchRequestHandlerContext {
    /**
     * A pre-scoped {@link IScopedClusterClient} for the current request using origin-only routing.
     */
    client: IScopedClusterClient;
}
