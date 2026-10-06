import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import type { SavedObjectConfig } from '@kbn/core-saved-objects-base-server-internal';
import type { RegisterDeprecationsConfig } from '@kbn/core-deprecations-server';
interface GetDeprecationProviderOptions {
    typeRegistry: ISavedObjectTypeRegistry;
    savedObjectsConfig: SavedObjectConfig;
    kibanaVersion: string;
}
export declare const getSavedObjectsDeprecationsProvider: (config: GetDeprecationProviderOptions) => RegisterDeprecationsConfig;
export {};
