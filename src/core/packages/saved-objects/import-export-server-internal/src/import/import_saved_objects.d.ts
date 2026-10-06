import type { Readable } from 'stream';
import type { SavedObjectsImportResponse } from '@kbn/core-saved-objects-common';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { AccessControlImportTransformsFactory, ISavedObjectTypeRegistry, SavedObjectsImportHook } from '@kbn/core-saved-objects-server';
import type { Logger } from '@kbn/logging';
/**
 * Options to control the import operation.
 */
export interface ImportSavedObjectsOptions {
    /** The stream of {@link SavedObject | saved objects} to import */
    readStream: Readable;
    /** The maximum number of object to import */
    objectLimit: number;
    /** If true, will override existing object if present. Note: this has no effect when used with the `createNewCopies` option. */
    overwrite: boolean;
    /** Refresh setting, defaults to `wait_for` */
    refresh?: boolean | 'wait_for';
    /** {@link SavedObjectsClientContract | client} to use to perform the import operation */
    savedObjectsClient: SavedObjectsClientContract;
    /** The registry of all known saved object types */
    typeRegistry: ISavedObjectTypeRegistry;
    /** List of registered import hooks */
    importHooks: Record<string, SavedObjectsImportHook[]>;
    /** if specified, will import in given namespace, else will import as global object */
    namespace?: string;
    /** If true, will create new copies of import objects, each with a random `id` and undefined `originId`. */
    createNewCopies: boolean;
    /**
     * If true, Kibana will apply various adjustments to the data that's being imported to maintain compatibility between
     * different Kibana versions (e.g. generate legacy URL aliases for all imported objects that have to change IDs).
     */
    compatibilityMode?: boolean;
    /**
     * If provided, Kibana will apply the given option to the `managed` property.
     */
    managed?: boolean;
    /** The factory function for creating the access control import transforms */
    createAccessControlImportTransforms?: AccessControlImportTransformsFactory;
    /** The logger to use during the import operation */
    log: Logger;
}
/**
 * Import saved objects from given stream. See the {@link SavedObjectsImportOptions | options} for more
 * detailed information.
 *
 * @public
 */
export declare function importSavedObjectsFromStream({ readStream, objectLimit, overwrite, createNewCopies, savedObjectsClient, typeRegistry, importHooks, namespace, refresh, compatibilityMode, managed, log, createAccessControlImportTransforms, }: ImportSavedObjectsOptions): Promise<SavedObjectsImportResponse>;
