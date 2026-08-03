import type { HttpStart, SavedObjectsImportConflictError, SavedObjectsImportAmbiguousConflictError } from '@kbn/core/public';
import type { FailedImport, ProcessedImportResponse } from './process_import_response';
export interface RetryDecision {
    retry: boolean;
    options: {
        overwrite: boolean;
        destinationId?: string;
    };
}
export interface FailedImportConflict {
    obj: FailedImport['obj'];
    error: SavedObjectsImportConflictError | SavedObjectsImportAmbiguousConflictError;
}
export declare function resolveImportErrors({ http, getConflictResolutions, state, }: {
    http: HttpStart;
    getConflictResolutions: (objects: FailedImportConflict[]) => Promise<Record<string, RetryDecision>>;
    state: {
        importCount: number;
        unmatchedReferences?: ProcessedImportResponse['unmatchedReferences'];
        failedImports?: ProcessedImportResponse['failedImports'];
        successfulImports?: ProcessedImportResponse['successfulImports'];
        file?: File;
        importMode: {
            createNewCopies: boolean;
            overwrite: boolean;
        };
    };
}): Promise<{
    status: string;
    importCount: number;
    failedImports: FailedImport[];
    successfulImports: import("@kbn/core/public").SavedObjectsImportSuccess[];
}>;
