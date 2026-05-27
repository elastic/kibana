/**
 * Error thrown when attempting to create duplicate index pattern based on title.
 * @public
 */
export declare class DuplicateDataViewError extends Error {
    /**
     * constructor
     * @param message - Error message
     */
    constructor(message: string);
}
