import type { SavedObjectsImportFailure } from '@kbn/core-saved-objects-common';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { CreatedObject, SavedObject } from '@kbn/core-saved-objects-server';
import type { ImportStateMap } from './types';
export interface CreateSavedObjectsParams<T> {
    objects: Array<SavedObject<T>>;
    accumulatedErrors: SavedObjectsImportFailure[];
    savedObjectsClient: SavedObjectsClientContract;
    importStateMap: ImportStateMap;
    namespace?: string;
    overwrite?: boolean;
    refresh?: boolean | 'wait_for';
    /**
     * If true, Kibana will apply various adjustments to the data that's being imported to maintain compatibility between
     * different Kibana versions (e.g. generate legacy URL aliases for all imported objects that have to change IDs).
     */
    compatibilityMode?: boolean;
    /**
     * If true, create the object as managed.
     *
     * This can be leveraged by applications to e.g. prevent edits to a managed
     * saved object. Instead, users can be guided to create a copy first and
     * make their edits to the copy.
     */
    managed?: boolean;
}
export interface CreateSavedObjectsResult<T> {
    createdObjects: Array<CreatedObject<T>>;
    errors: SavedObjectsImportFailure[];
}
/**
 * This function abstracts the bulk creation of import objects. The main reason for this is that the import ID map should dictate the IDs of
 * the objects we create, and the create results should be mapped to the original IDs that consumers will be able to understand.
 */
export declare const createSavedObjects: <T>({ objects, accumulatedErrors, savedObjectsClient, importStateMap, namespace, overwrite, refresh, compatibilityMode, managed, }: CreateSavedObjectsParams<T>) => Promise<CreateSavedObjectsResult<T>>;
