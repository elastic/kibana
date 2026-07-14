import type { KibanaRequest } from '@kbn/core-http-server';
import type { IScopedClusterClient, ElasticsearchRequestHandlerContext } from '@kbn/core-elasticsearch-server';
import type { InternalElasticsearchServiceStart } from './types';
/**
 * The {@link ElasticsearchRequestHandlerContext} implementation.
 * @internal
 */
export declare class CoreElasticsearchRouteHandlerContext implements ElasticsearchRequestHandlerContext {
    #private;
    private readonly elasticsearchStart;
    private readonly request;
    constructor(elasticsearchStart: InternalElasticsearchServiceStart, request: KibanaRequest);
    get client(): IScopedClusterClient;
}
