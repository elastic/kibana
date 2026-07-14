import Boom from '@hapi/boom';
import type { SavedObjectsResolveResponse } from '@kbn/core-saved-objects-api-server';
declare const code: unique symbol;
/**
 * The DecoratedError interface extends the Boom error object
 * and augments it with the 'SavedObjectsClientErrorCode' symbol
 * property.
 */
export interface DecoratedError extends Boom.Boom {
    /** the 'SavedObjectsClientErrorCode' symbol */
    [code]?: string;
}
/**
 * Extracts the contents of a decorated error to return the attributes for bulk operations.
 */
export declare const errorContent: (error: DecoratedError) => Boom.Payload;
/**
 * Error result for the internal bulk resolve method.
 */
export interface BulkResolveError {
    /** The type of the saved object */
    type: string;
    /** The id of the saved object */
    id: string;
    /** The decorated resolve error */
    error: DecoratedError;
}
/** Type guard used in the repository. */
export declare function isBulkResolveError<T>(result: SavedObjectsResolveResponse<T> | BulkResolveError): result is BulkResolveError;
/**
 * The SavedObjectsErrorHelpers class is a simple class for creating, decorating, and
 * qualifying saved object errors.
 * @public
 */
export declare class SavedObjectsErrorHelpers {
    /**
     * Determines if an error is a saved objects client error
     * @public
     * @param error the error to check
     * @returns boolean - true if error is a saved objects client error
     */
    static isSavedObjectsClientError(error: any): error is DecoratedError;
    /**
     * Determines if an error is a saved objects bulk resolve error
     * @public
     * @param result the resolve respoonse to check
     * @returns boolean - true if result is a saved objects bulk resolve error
     */
    static isBulkResolveError<T>(result: SavedObjectsResolveResponse<T> | BulkResolveError): result is BulkResolveError;
    /**
     * Decorates a bad request error (400) by adding a reason
     * @public
     * @param error the error to decorate
     * @param reason the reason for the bad request (optional)
     * @returns the decorated error
     */
    static decorateBadRequestError(error: Error, reason?: string): DecoratedError;
    /**
     * Creates a decorated bad request error (400). Bad requests come in a few flavors:
     * unsupported type, invalid version, elastic search cannot execute script, or plain
     * vanilla bad request.
     * @public
     * @param reason the reason for the bad request (optional)
     * @returns the decorated error
     */
    static createBadRequestError(reason?: string): DecoratedError;
    /**
     * Creates a decorated unsupported type error (flavor of bad request 400)
     * @public
     * @param type the unsupported saved object type
     * @returns the decorated error
     */
    static createUnsupportedTypeError(type: string): DecoratedError;
    /**
     * Determines if an error is a bad request error (400)
     * @public
     * @param error the error or decorated error
     * @returns boolean - true if error is a bad request error
     */
    static isBadRequestError(error: Error | DecoratedError): boolean;
    /**
     * Creates a decorated invalid version error (flavor of bad request 400)
     * @public
     * @param versionInput the version string (optional)
     * @returns the decorated error
     */
    static createInvalidVersionError(versionInput?: string): DecoratedError;
    /**
     * Determines if an error is an invalid version error (flavor of bad request 400)
     * @public
     * @param error the error or decorated error
     * @returns boolean - true if error is an invalid version error
     */
    static isInvalidVersionError(error: Error | DecoratedError): boolean;
    /**
     * Decorates an error as an not authorized error (401)
     * @public
     * @param error the error to decorate
     * @param reason the reason for the not authorized error (optional)
     * @returns the decorated error
     */
    static decorateNotAuthorizedError(error: Error, reason?: string): DecoratedError;
    /**
     * Determines if an error is a not authorized error (401)
     * @public
     * @param error the error or decorated error
     * @returns boolean - true if error is a not authorized error
     */
    static isNotAuthorizedError(error: Error | DecoratedError): boolean;
    /**
     * Decorates an error as a forbidden error (403)
     * @public
     * @param error the error to decorate
     * @param reason the reason for the forbidden error (optional)
     * @returns the decorated error
     */
    static decorateForbiddenError(error: Error, reason?: string): DecoratedError;
    /**
     * Determines if an error is a forbidden error (403)
     * @public
     * @param error the error or decorated error
     * @returns boolean - true if error is a forbidden error
     */
    static isForbiddenError(error: Error | DecoratedError): boolean;
    /**
     * Decorates a request entity too large error (413)
     * @public
     * @param error the error to decorate
     * @param reason the reason for the request entity too large error
     * @returns the decorated error
     */
    static decorateRequestEntityTooLargeError(error: Error, reason?: string): DecoratedError;
    /**
     * Determines if an error is a request entity too large error(413)
     * @public
     * @param error the error or decorated error
     * @returns boolean - true if error is a request entity too large error
     */
    static isRequestEntityTooLargeError(error: Error | DecoratedError): boolean;
    /**
     * Creates a generic not found error (404)
     * @public
     * @param type the saved object type or null (default is null)
     * @param id the saved object id or null (default is null)
     * @returns the decorated error
     */
    static createGenericNotFoundError(type?: string | null, id?: string | null): DecoratedError;
    /**
     * Creates an alias not found error (flavor of general error 500)
     * @public
     * @param alias the unfound saved object alias
     * @returns the decorated error
     */
    static createIndexAliasNotFoundError(alias: string): DecoratedError;
    /**
     * Decorates an index alias not found error (flavor of general error 500)
     * @public
     * @param error the error to decorate
     * @param alias the unfound index alias
     * @returns the decorated error
     */
    static decorateIndexAliasNotFoundError(error: Error, alias: string): DecoratedError;
    /**
     * Determines if an error is a not found error (404)
     * @public
     * @param error the error or decorated error
     * @returns boolean - true if error is a not found error
     */
    static isNotFoundError(error: Error | DecoratedError): boolean;
    /**
     * Decorates a conflict error (409)
     * @public
     * @param error the error to decorate
     * @param reason the reason for the conflict error (optional)
     * @returns the decorated error
     */
    static decorateConflictError(error: Error, reason?: string): DecoratedError;
    /**
     * Creates a conflict error (409)
     * @public
     * @param type the saved object type
     * @param id the saved object id
     * @param reason the reason for the conflict error (optional)
     * @returns the decorated error
     */
    static createConflictError(type: string, id: string, reason?: string): DecoratedError;
    /**
     * Determines if an error is a conflict error (409)
     * @public
     * @param error the error or decorated error
     * @returns boolean - true if error is a conflict error
     */
    static isConflictError(error: Error | DecoratedError): boolean;
    /**
     * Decorates a too many requests error (429)
     * @public
     * @param error the error to decorate
     * @param reason the reason for the too many requests error (optional)
     * @returns the decorated error
     */
    static decorateTooManyRequestsError(error: Error, reason?: string): DecoratedError;
    /**
     * Creates a too many requests error (429)
     * @public
     * @param type the saved object type
     * @param id the saved object id
     * @returns the decorated error
     */
    static createTooManyRequestsError(type: string, id: string): DecoratedError;
    /**
     * Determines if an error is a too many requests error (429)
     * @public
     * @param error the error or decorated error
     * @returns boolean - true if error is a too many requests error
     */
    static isTooManyRequestsError(error: Error | DecoratedError): boolean;
    /**
     * Decorates an elastic search cannot execute script error (flavor of 400)
     * @public
     * @param error the error to decorate
     * @param reason the reason for the cannot execute error (optional)
     * @returns the decorated error
     */
    static decorateEsCannotExecuteScriptError(error: Error, reason?: string): DecoratedError;
    /**
     * Determines if an error is an elastic search cannot execute script error (flavor of 400)
     * @public
     * @param error the error or decorated error
     * @returns boolean - true if error is a cannot execute error
     */
    static isEsCannotExecuteScriptError(error: Error | DecoratedError): boolean;
    /**
     * Decorates an elastic search unavailable error (503)
     * @public
     * @param error the error to decorate
     * @param reason the reason for the elastic search unavailable error (optional)
     * @returns the decorated error
     */
    static decorateEsUnavailableError(error: Error, reason?: string): DecoratedError;
    /**
     * Determines if an error is an elastic search unavailable error (flavor of 400)
     * @public
     * @param error the error or decorated error
     * @returns boolean - true if error is an elastic search unavailable error
     */
    static isEsUnavailableError(error: Error | DecoratedError): boolean;
    /**
     * Decorates a general error (500)
     * @public
     * @param error the error to decorate
     * @param reason the reason for the error (optional)
     * @returns the decorated error
     */
    static decorateGeneralError(error: Error, reason?: string): DecoratedError;
    /**
     * Determines if an error is a general error (500)
     * @public
     * @param error the error or decorated error
     * @returns boolean - true if error is a general error
     */
    static isGeneralError(error: Error | DecoratedError): boolean;
    /**
     * Creates a generic elastic search not present error
     * @public
     * @param type the saved object type or null, default null
     * @param id the saved object id or null, default null
     * @returns the decorated error
     */
    static createGenericNotFoundEsUnavailableError(type?: string | null, id?: string | null): DecoratedError;
}
export {};
