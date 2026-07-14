import type { SavedObjectsImportFailure, SavedObjectsImportRetry } from '@kbn/core-saved-objects-common';
import type { SavedObject } from '@kbn/core-saved-objects-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { ImportStateMap } from './types';
export interface ValidateReferencesParams {
    objects: Array<SavedObject<{
        title?: string;
    }>>;
    savedObjectsClient: SavedObjectsClientContract;
    namespace: string | undefined;
    importStateMap: ImportStateMap;
    retries?: SavedObjectsImportRetry[];
}
export declare function validateReferences(params: ValidateReferencesParams): Promise<SavedObjectsImportFailure[]>;
