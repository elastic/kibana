import type { Logger, KibanaRequest } from '@kbn/core/server';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { Version } from '@kbn/object-versioning';
import type { MSearchIn, MSearchOut } from '../../common';
import type { IContentClient } from '../content_client';
import type { ContentCrud } from './crud';
import { EventBus } from './event_bus';
import { ContentRegistry } from './registry';
export interface GetContentClientForRequestDependencies {
    requestHandlerContext: RequestHandlerContext;
    request: KibanaRequest;
}
export interface CoreApi {
    /**
     * Register a new content in the registry.
     *
     * @param contentType The content type to register
     * @param config The content configuration
     */
    register: ContentRegistry['register'];
    /** Handler to retrieve a content crud instance */
    crud: <T = unknown>(contentType: string) => ContentCrud<T>;
    /** Content management event bus */
    eventBus: EventBus;
    /** Client getters to interact with registered content types. */
    contentClient: {
        /** Client getter to interact with registered content types for the current HTTP request. */
        getForRequest(deps: GetContentClientForRequestDependencies): {
            for: <T = unknown>(contentTypeId: string, version?: Version) => IContentClient<T>;
            msearch(args: MSearchIn): Promise<MSearchOut>;
        };
    };
}
export interface CoreInitializerContext {
    logger: Logger;
}
export interface CoreSetup {
    /** Content registry instance */
    contentRegistry: ContentRegistry;
    /** Api exposed to other plugins */
    api: CoreApi;
}
export declare class Core {
    private readonly ctx;
    private contentRegistry;
    private eventBus;
    constructor(ctx: CoreInitializerContext);
    setup(): CoreSetup;
    private getContentClientForRequest;
}
