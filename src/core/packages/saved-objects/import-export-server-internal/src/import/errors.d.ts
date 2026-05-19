import type { SavedObject } from '@kbn/core-saved-objects-common';
/**
 * @public
 */
export declare class SavedObjectsImportError extends Error {
    readonly type: string;
    readonly attributes?: Record<string, any> | undefined;
    private constructor();
    static importSizeExceeded(limit: number): SavedObjectsImportError;
    static nonUniqueImportObjects(nonUniqueEntries: string[]): SavedObjectsImportError;
    static nonUniqueRetryObjects(nonUniqueRetryObjects: string[]): SavedObjectsImportError;
    static nonUniqueRetryDestinations(nonUniqueRetryDestinations: string[]): SavedObjectsImportError;
    static referencesFetchError(objects: SavedObject[]): SavedObjectsImportError;
}
