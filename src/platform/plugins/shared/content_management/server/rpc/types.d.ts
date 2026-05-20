import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ContentRegistry } from '../core';
import type { MSearchService } from '../core/msearch';
export interface Context {
    contentRegistry: ContentRegistry;
    requestHandlerContext: RequestHandlerContext;
    request: KibanaRequest;
    mSearchService: MSearchService;
}
