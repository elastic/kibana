import type { Logger, KibanaRequest } from '@kbn/core/server';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { Version } from '@kbn/object-versioning';
import type { MSearchIn, MSearchOut } from '../../common';
import type { ContentRegistry } from '../core';
import type { MSearchService } from '../core/msearch';
export declare const getContentClientFactory: ({ contentRegistry }: {
    contentRegistry: ContentRegistry;
}) => (contentTypeId: string) => {
    /**
     * Client getter to interact with the registered content type.
     */
    getForRequest: <T = unknown>({ request, requestHandlerContext, version, }: {
        request: KibanaRequest;
        requestHandlerContext: RequestHandlerContext;
        version?: Version;
    }) => import("./types").IContentClient<T>;
};
export declare const getMSearchClientFactory: ({ contentRegistry, mSearchService, logger, }: {
    contentRegistry: ContentRegistry;
    mSearchService: MSearchService;
    logger: Logger;
}) => ({ requestHandlerContext, request, }: {
    requestHandlerContext: RequestHandlerContext;
    request: KibanaRequest;
}) => {
    msearch: ({ contentTypes, query }: MSearchIn) => Promise<MSearchOut>;
};
