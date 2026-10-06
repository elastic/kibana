/**
 * Error thrown when action attempted without sufficient access.
 * @constructor
 * @param {string} message - Saved object id of data view for display in error message
 */
export declare class DataViewInsufficientAccessError extends Error {
    /**
     * constructor
     * @param {string} message - Saved object id of data view for display in error message
     */
    constructor(savedObjectId?: string);
}
