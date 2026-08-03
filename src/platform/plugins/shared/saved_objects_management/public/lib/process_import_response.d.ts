import type { SavedObjectsImportResponse, SavedObjectsImportConflictError, SavedObjectsImportAmbiguousConflictError, SavedObjectsImportUnsupportedTypeError, SavedObjectsImportMissingReferencesError, SavedObjectsImportUnknownError, SavedObjectsImportFailure, SavedObjectsImportSuccess, SavedObjectsImportWarning, SavedObjectsImportUnexpectedAccessControlMetadataError } from '@kbn/core/public';
export interface FailedImport {
    obj: Omit<SavedObjectsImportFailure, 'error'>;
    error: SavedObjectsImportConflictError | SavedObjectsImportAmbiguousConflictError | SavedObjectsImportUnsupportedTypeError | SavedObjectsImportMissingReferencesError | SavedObjectsImportUnknownError | SavedObjectsImportUnexpectedAccessControlMetadataError;
}
interface UnmatchedReference {
    existingIndexPatternId: string;
    list: Array<Omit<SavedObjectsImportFailure, 'error'>>;
    newIndexPatternId?: string;
}
export interface ProcessedImportResponse {
    failedImports: FailedImport[];
    successfulImports: SavedObjectsImportSuccess[];
    unmatchedReferences: UnmatchedReference[];
    status: 'success' | 'idle';
    importCount: number;
    importWarnings: SavedObjectsImportWarning[];
}
export declare function processImportResponse(response: SavedObjectsImportResponse): ProcessedImportResponse;
export {};
