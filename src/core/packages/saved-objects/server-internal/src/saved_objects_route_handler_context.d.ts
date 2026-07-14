import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { SavedObjectsRequestHandlerContext, ISavedObjectTypeRegistry, SavedObjectsClientProviderOptions } from '@kbn/core-saved-objects-server';
import type { InternalSavedObjectsServiceStart } from './saved_objects_service';
/**
 * The {@link SavedObjectsRequestHandlerContext} implementation.
 * @internal
 */
export declare class CoreSavedObjectsRouteHandlerContext implements SavedObjectsRequestHandlerContext {
    #private;
    private readonly savedObjectsStart;
    private readonly request;
    constructor(savedObjectsStart: InternalSavedObjectsServiceStart, request: KibanaRequest);
    get client(): SavedObjectsClientContract;
    get typeRegistry(): ISavedObjectTypeRegistry;
    getClient: (options?: SavedObjectsClientProviderOptions) => SavedObjectsClientContract;
    getExporter: (client: SavedObjectsClientContract) => import("@kbn/core-saved-objects-server").ISavedObjectsExporter;
    getImporter: (client: SavedObjectsClientContract) => import("@kbn/core-saved-objects-server").ISavedObjectsImporter;
}
