import type { SavedObjectsImportFailure } from '@kbn/core-saved-objects-common';
import type { CreatedObject, SavedObject, SavedObjectBulkResult, SavedObjectErrorResult } from '@kbn/core-saved-objects-server';
import type { LegacyUrlAlias } from '@kbn/core-saved-objects-base-server-internal';
/** A remapped bulk-create result, which is either a created object or an error result. */
export type RemappedImportResult<T> = CreatedObject<T> | (SavedObjectErrorResult & {
    destinationId?: string;
});
export declare function extractErrors(savedObjectResults: Array<RemappedImportResult<unknown>>, savedObjectsToImport: Array<SavedObject<any>>, legacyUrlAliasResults: SavedObjectBulkResult[], legacyUrlAliasesToCreate: Map<string, SavedObject<LegacyUrlAlias>>): SavedObjectsImportFailure[];
