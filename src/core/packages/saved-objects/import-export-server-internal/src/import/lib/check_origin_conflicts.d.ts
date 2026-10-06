import type { SavedObjectsImportFailure, SavedObjectsImportRetry } from '@kbn/core-saved-objects-common';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { ISavedObjectTypeRegistry, SavedObject } from '@kbn/core-saved-objects-server';
import type { ImportStateMap } from './types';
interface CheckOriginConflictsParams {
    objects: Array<SavedObject<{
        title?: string;
    }>>;
    savedObjectsClient: SavedObjectsClientContract;
    typeRegistry: ISavedObjectTypeRegistry;
    namespace?: string;
    ignoreRegularConflicts?: boolean;
    importStateMap: ImportStateMap;
    pendingOverwrites: Set<string>;
    retries?: SavedObjectsImportRetry[];
}
/**
 * This function takes all objects to import, and checks "multi-namespace" types for potential conflicts. An object with a multi-namespace
 * type may include an `originId` field, which means that it should conflict with other objects that originate from the same source.
 * Expected behavior of importing saved objects (single-namespace or multi-namespace):
 *  1. The object 'foo' is exported from space A and imported to space B -- a new object 'bar' is created.
 *  2. Then, the object 'bar' is exported from space B and imported to space C -- a new object 'baz' is created.
 *  3. Then, the object 'baz' is exported from space C to space A -- the object conflicts with 'foo', which must be overwritten to continue.
 * This behavior originated with "single-namespace" types, and this function was added to ensure importing objects of multi-namespace types
 * will behave in the same way.
 *
 * To achieve this behavior for multi-namespace types, a search request is made for each object to determine if any objects of this type
 * that match this object's `originId` or `id` exist in the specified namespace:
 *  - If this is a `Right` result; return the import object and allow `createSavedObjects` to handle the conflict (if any).
 *  - If this is a `Left` "partial match" result:
 *     A. If there is a single source and destination match, add the destination to the importStateMap and return the import object, which
 *        will allow `createSavedObjects` to modify the ID before creating the object (thus ensuring a conflict during).
 *     B. Otherwise, this is an "ambiguous conflict" result; return an error.
 */
export declare function checkOriginConflicts({ objects, retries, ...params }: CheckOriginConflictsParams): Promise<{
    errors: SavedObjectsImportFailure[];
    importStateMap: ImportStateMap;
    pendingOverwrites: Set<string>;
}>;
export {};
