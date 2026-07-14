import type { CoreElasticsearchRouteHandlerContext } from '@kbn/core-elasticsearch-server-internal';
import type { CoreSavedObjectsRouteHandlerContext } from '@kbn/core-saved-objects-server-internal';
import type { DeprecationsRequestHandlerContext, DeprecationsClient } from '@kbn/core-deprecations-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { InternalDeprecationsServiceStart } from './deprecations_service';
/**
 * The {@link DeprecationsRequestHandlerContext} implementation.
 * @internal
 */
export declare class CoreDeprecationsRouteHandlerContext implements DeprecationsRequestHandlerContext {
    #private;
    private readonly deprecationsStart;
    private readonly elasticsearchRouterHandlerContext;
    private readonly savedObjectsRouterHandlerContext;
    private readonly request;
    constructor(deprecationsStart: InternalDeprecationsServiceStart, elasticsearchRouterHandlerContext: CoreElasticsearchRouteHandlerContext, savedObjectsRouterHandlerContext: CoreSavedObjectsRouteHandlerContext, request: KibanaRequest);
    get client(): DeprecationsClient;
}
