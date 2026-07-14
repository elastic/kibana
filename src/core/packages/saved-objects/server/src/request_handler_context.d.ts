import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { ISavedObjectsExporter } from './export';
import type { ISavedObjectsImporter } from './import';
import type { ISavedObjectTypeRegistry } from './type_registry';
import type { SavedObjectsClientProviderOptions } from './client_factory';
/**
 * Core's `savedObjects` request handler context.
 * @public
 */
export interface SavedObjectsRequestHandlerContext {
    client: SavedObjectsClientContract;
    typeRegistry: ISavedObjectTypeRegistry;
    getClient: (options?: SavedObjectsClientProviderOptions) => SavedObjectsClientContract;
    getExporter: (client: SavedObjectsClientContract) => ISavedObjectsExporter;
    getImporter: (client: SavedObjectsClientContract) => ISavedObjectsImporter;
}
