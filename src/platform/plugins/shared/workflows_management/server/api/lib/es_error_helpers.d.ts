/**
 * Returns true if the error is an ES `index_not_found_exception`.
 * This is expected when an index has not yet been created (e.g. no workflows executed yet).
 */
export declare const isIndexNotFoundError: (error: unknown) => boolean;
