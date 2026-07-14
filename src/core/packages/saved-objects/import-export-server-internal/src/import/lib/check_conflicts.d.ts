import type { SavedObjectsImportFailure, SavedObjectsImportRetry } from '@kbn/core-saved-objects-common';
import type { SavedObject } from '@kbn/core-saved-objects-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { ImportStateMap } from './types';
interface CheckConflictsParams {
    objects: Array<SavedObject<{
        title?: string;
    }>>;
    savedObjectsClient: SavedObjectsClientContract;
    namespace?: string;
    ignoreRegularConflicts?: boolean;
    retries?: SavedObjectsImportRetry[];
    createNewCopies?: boolean;
}
export declare function checkConflicts({ objects, savedObjectsClient, namespace, ignoreRegularConflicts, retries, createNewCopies, }: CheckConflictsParams): Promise<{
    filteredObjects: SavedObject<{
        title?: string;
    }>[];
    errors: SavedObjectsImportFailure[];
    importStateMap: ImportStateMap;
    pendingOverwrites: Set<string>;
}>;
export {};
