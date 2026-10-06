import type { IRouter, RequestHandlerContextBase } from '@kbn/core-http-server';
import type { ElasticsearchRequestHandlerContext } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsRequestHandlerContext } from '@kbn/core-saved-objects-server';
/**
 * Request handler context used by core's savedObjects routes.
 * @internal
 */
export interface InternalSavedObjectsRequestHandlerContext extends RequestHandlerContextBase {
    core: Promise<{
        savedObjects: SavedObjectsRequestHandlerContext;
        elasticsearch: ElasticsearchRequestHandlerContext;
    }>;
}
/**
 * Router bound to the {@link InternalSavedObjectsRequestHandlerContext}.
 * Used by core's savedObjects routes.
 * @internal
 */
export type InternalSavedObjectRouter = IRouter<InternalSavedObjectsRequestHandlerContext>;
