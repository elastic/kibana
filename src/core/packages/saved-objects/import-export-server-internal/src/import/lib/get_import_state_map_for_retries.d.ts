import type { SavedObjectsImportRetry } from '@kbn/core-saved-objects-common';
import type { SavedObject } from '@kbn/core-saved-objects-server';
import type { ImportStateMap } from './types';
interface GetImportStateMapForRetriesParams {
    objects: SavedObject[];
    retries: SavedObjectsImportRetry[];
    createNewCopies: boolean;
}
/**
 * Assume that all objects exist in the `retries` map (due to filtering at the beginning of `resolveSavedObjectsImportErrors`).
 */
export declare function getImportStateMapForRetries(params: GetImportStateMapForRetriesParams): ImportStateMap;
export {};
