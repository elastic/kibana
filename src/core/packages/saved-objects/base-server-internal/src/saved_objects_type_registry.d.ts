import type { SavedObjectsType, ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
export interface SavedObjectTypeRegistryConfig {
    legacyTypes?: string[];
}
export interface ISavedObjectTypeRegistryInternal extends ISavedObjectTypeRegistry {
    /**
     * Register a {@link SavedObjectsType | type} inside the registry.
     * A type can only be registered once. subsequent calls with the same type name will throw an error.
     *
     * @internal
     */
    registerType(type: SavedObjectsType): void;
    /**
     * Sets whether access control is enabled
     *
     * @internal
     */
    setAccessControlEnabled(enabled: boolean): void;
    /**
     * Gets whether access control is enabled
     *
     * @internal
     */
    isAccessControlEnabled(): boolean;
}
/**
 * Core internal implementation of {@link ISavedObjectTypeRegistry}.
 *
 * @internal should only be used outside of Core for testing purposes.
 */
export declare class SavedObjectTypeRegistry implements ISavedObjectTypeRegistryInternal {
    private readonly types;
    private readonly legacyTypesMap;
    private accessControlEnabled;
    constructor({ legacyTypes }?: SavedObjectTypeRegistryConfig);
    /** {@inheritDoc ISavedObjectTypeRegistryInternal.registerType} */
    registerType(type: SavedObjectsType): void;
    /** {@inheritDoc ISavedObjectTypeRegistry.getLegacyTypes} */
    getLegacyTypes(): string[];
    /** {@inheritDoc ISavedObjectTypeRegistry.getType} */
    getType(type: string): SavedObjectsType<any> | undefined;
    /** {@inheritDoc ISavedObjectTypeRegistry.getVisibleTypes} */
    getVisibleTypes(): SavedObjectsType<any>[];
    /** {@inheritDoc ISavedObjectTypeRegistry.getVisibleToHttpApisTypes}  */
    getVisibleToHttpApisTypes(): SavedObjectsType<any>[];
    /** {@inheritDoc ISavedObjectTypeRegistry.getAllTypes} */
    getAllTypes(): SavedObjectsType<any>[];
    /** {@inheritDoc ISavedObjectTypeRegistry.getImportableAndExportableTypes} */
    getImportableAndExportableTypes(): SavedObjectsType<any>[];
    /** {@inheritDoc ISavedObjectTypeRegistry.isNamespaceAgnostic} */
    isNamespaceAgnostic(type: string): boolean;
    /** {@inheritDoc ISavedObjectTypeRegistry.isSingleNamespace} */
    isSingleNamespace(type: string): boolean;
    /** {@inheritDoc ISavedObjectTypeRegistry.isMultiNamespace} */
    isMultiNamespace(type: string): boolean;
    /** {@inheritDoc ISavedObjectTypeRegistry.isShareable} */
    isShareable(type: string): boolean;
    /** {@inheritDoc ISavedObjectTypeRegistry.isHidden} */
    isHidden(type: string): boolean;
    /** {@inheritDoc ISavedObjectTypeRegistry.isHiddenFromHttpApi} */
    isHiddenFromHttpApis(type: string): boolean;
    /** {@inheritDoc ISavedObjectTypeRegistry.getType} */
    getIndex(type: string): string | undefined;
    /** {@inheritDoc ISavedObjectTypeRegistry.isImportableAndExportable} */
    isImportableAndExportable(type: string): boolean;
    getNameAttribute(type: string): string;
    supportsAccessControl(type: string): boolean;
    /** {@inheritDoc ISavedObjectTypeRegistryInternal.setAccessControlEnabled} */
    setAccessControlEnabled(enabled: boolean): void;
    /** {@inheritDoc ISavedObjectTypeRegistryInternal.isAccessControlEnabled} */
    isAccessControlEnabled(): boolean;
}
