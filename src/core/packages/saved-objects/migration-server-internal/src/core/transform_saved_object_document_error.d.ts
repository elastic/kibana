/**
 * Error thrown when saved object migrations encounter a transformation error.
 * Transformation errors happen when a transform function throws an error for an unsanitized saved object
 */
export declare class TransformSavedObjectDocumentError extends Error {
    readonly originalError: Error;
    readonly version: string;
    constructor(originalError: Error, version: string);
}
