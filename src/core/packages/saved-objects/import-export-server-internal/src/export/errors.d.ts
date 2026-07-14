import type { SavedObject } from '@kbn/core-saved-objects-server';
/**
 * @public
 */
export declare class SavedObjectsExportError extends Error {
    readonly type: string;
    readonly attributes?: Record<string, any> | undefined;
    constructor(type: string, message: string, attributes?: Record<string, any> | undefined);
    static exportSizeExceeded(limit: number): SavedObjectsExportError;
    static objectFetchError(objects: SavedObject[]): SavedObjectsExportError;
    /**
     * Error returned when a {@link SavedObjectsExportTransform | export transform} threw an error
     */
    static objectTransformError(objects: SavedObject[], cause: Error): SavedObjectsExportError;
    /**
     * Error returned when a {@link SavedObjectsExportTransform | export transform} performed an invalid operation
     * during the transform, such as removing objects from the export, or changing an object's type or id.
     */
    static invalidTransformError(objectKeys: string[]): SavedObjectsExportError;
}
