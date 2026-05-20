import { ContentType } from './content_type';
import type { EventBus } from './event_bus';
import type { ContentStorage, ContentTypeDefinition, MSearchConfig } from './types';
import type { ContentCrud } from './crud';
export declare class ContentRegistry {
    private eventBus;
    private types;
    constructor(eventBus: EventBus);
    /**
     * Register a new content in the registry.
     *
     * @param contentType The content type to register
     * @param config The content configuration
     */
    register<S extends ContentStorage<any, any, MSearchConfig<any, any>> = ContentStorage>(definition: ContentTypeDefinition<S>): {
        /**
         * Client getters to interact with the registered content type.
         */
        contentClient: {
            getForRequest: <T = unknown>({ request, requestHandlerContext, version, }: {
                request: import("@kbn/core/packages/http/server").KibanaRequest;
                requestHandlerContext: import("@kbn/core/packages/http/request-handler-context-server").RequestHandlerContext;
                version?: import("@kbn/object-versioning").Version;
            }) => import("../content_client").IContentClient<T>;
        };
    };
    getContentType(id: string): ContentType;
    /** Get the definition for a specific content type */
    getDefinition(id: string): ContentTypeDefinition<ContentStorage<unknown, unknown, MSearchConfig<unknown, unknown>>>;
    /** Get the crud instance of a content type */
    getCrud<T = unknown>(id: string): ContentCrud<T>;
    /** Helper to validate if a content type has been registered */
    isContentRegistered(id: string): boolean;
}
