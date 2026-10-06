/**
 * Error thrown when saved object has been changed when attempting to save.
 */
export declare class DataViewSavedObjectConflictError extends Error {
    /**
     * constructor
     * @param savedObjectId saved object id with conflict
     */
    constructor(savedObjectId: string);
}
