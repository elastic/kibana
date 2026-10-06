import type { ServiceToken } from '@kbn/core-di';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { ISavedObjectTypeRegistry, SavedObjectsClientProviderOptions } from '@kbn/core-saved-objects-server';
/**
 * Factory type for creating parameterized Saved Objects client instances.
 * @see {@link SavedObjectsClientContract}
 * @public
 */
export type ISavedObjectsClientFactory = (options?: SavedObjectsClientProviderOptions) => SavedObjectsClientContract;
/**
 * The Saved Objects client instance in the current HTTP request context.
 * @see {@link SavedObjectsClientContract}
 * @public
 */
export declare const SavedObjectsClient: ServiceToken<SavedObjectsClientContract>;
/**
 * The Saved Objects client factory that constructs a client instance the current HTTP request context.
 * @public
 */
export declare const SavedObjectsClientFactory: ServiceToken<ISavedObjectsClientFactory>;
/**
 * The Saved Objects type registry.
 * @see {@link ISavedObjectTypeRegistry}
 * @public
 */
export declare const SavedObjectsTypeRegistry: ServiceToken<ISavedObjectTypeRegistry>;
