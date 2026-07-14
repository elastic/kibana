import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { ISavedObjectTypeRegistry, SavedObjectsClientFactory, SavedObjectsClientProviderOptions, SavedObjectsEncryptionExtensionFactory, SavedObjectsSecurityExtensionFactory, SavedObjectsSpacesExtensionFactory, SavedObjectsExtensions } from '@kbn/core-saved-objects-server';
/**
 * @internal
 */
export type ISavedObjectsClientProvider = Pick<SavedObjectsClientProvider, keyof SavedObjectsClientProvider>;
/**
 * Provider for the Scoped Saved Objects Client.
 *
 * @internal
 */
export declare class SavedObjectsClientProvider {
    private _clientFactory;
    private readonly _originalClientFactory;
    private readonly encryptionExtensionFactory?;
    private readonly securityExtensionFactory?;
    private readonly spacesExtensionFactory?;
    private readonly _typeRegistry;
    constructor({ defaultClientFactory, typeRegistry, encryptionExtensionFactory, securityExtensionFactory, spacesExtensionFactory, }: {
        defaultClientFactory: SavedObjectsClientFactory;
        typeRegistry: ISavedObjectTypeRegistry;
        encryptionExtensionFactory?: SavedObjectsEncryptionExtensionFactory;
        securityExtensionFactory?: SavedObjectsSecurityExtensionFactory;
        spacesExtensionFactory?: SavedObjectsSpacesExtensionFactory;
    });
    setClientFactory(customClientFactory: SavedObjectsClientFactory): void;
    getClient(request: KibanaRequest, { includedHiddenTypes, excludedExtensions }?: SavedObjectsClientProviderOptions): SavedObjectsClientContract;
    getExtensions(request: KibanaRequest, excludedExtensions: string[]): SavedObjectsExtensions;
}
