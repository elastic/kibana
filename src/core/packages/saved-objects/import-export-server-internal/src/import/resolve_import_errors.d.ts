import type { Readable } from 'stream';
import type { SavedObjectsImportRetry, SavedObjectsImportResponse } from '@kbn/core-saved-objects-common';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { ISavedObjectTypeRegistry, SavedObjectsImportHook, AccessControlImportTransformsFactory } from '@kbn/core-saved-objects-server';
/**
 * Options to control the "resolve import" operation.
 */
export interface ResolveSavedObjectsImportErrorsOptions {
    /** The stream of {@link SavedObject | saved objects} to resolve errors from */
    readStream: Readable;
    /** The maximum number of object to import */
    objectLimit: number;
    /** client to use to perform the import operation */
    savedObjectsClient: SavedObjectsClientContract;
    /** The registry of all known saved object types */
    typeRegistry: ISavedObjectTypeRegistry;
    /** List of registered import hooks */
    importHooks: Record<string, SavedObjectsImportHook[]>;
    /** saved object import references to retry */
    retries: SavedObjectsImportRetry[];
    /** if specified, will import in given namespace */
    namespace?: string;
    /** If true, will create new copies of import objects, each with a random `id` and undefined `originId`. */
    createNewCopies: boolean;
    /**
     * If true, Kibana will apply various adjustments to the data that's being retried to import to maintain compatibility between
     * different Kibana versions (e.g. generate legacy URL aliases for all imported objects that have to change IDs).
     */
    compatibilityMode?: boolean;
    /** If true, will create objects as managed.
     * This property allows plugin authors to implement read-only UI's
     */
    managed?: boolean;
    /** The factory function for creating the access control import transforms */
    createAccessControlImportTransforms?: AccessControlImportTransformsFactory;
}
/**
 * Resolve and return saved object import errors.
 * See the {@link SavedObjectsResolveImportErrorsOptions | options} for more detailed information.
 *
 * @public
 */
export declare function resolveSavedObjectsImportErrors({ readStream, objectLimit, retries, savedObjectsClient, typeRegistry, importHooks, namespace, createNewCopies, compatibilityMode, managed, createAccessControlImportTransforms, }: ResolveSavedObjectsImportErrorsOptions): Promise<SavedObjectsImportResponse>;
