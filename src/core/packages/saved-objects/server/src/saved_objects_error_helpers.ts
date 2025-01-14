/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';

// 400 - badRequest
const CODE_BAD_REQUEST = 'SavedObjectsClient/badRequest';
// 400 - invalid version
const CODE_INVALID_VERSION = 'SavedObjectsClient/invalidVersion';
// 401 - Not Authorized
const CODE_NOT_AUTHORIZED = 'SavedObjectsClient/notAuthorized';
// 403 - Forbidden
const CODE_FORBIDDEN = 'SavedObjectsClient/forbidden';
// 413 - Request Entity Too Large
const CODE_REQUEST_ENTITY_TOO_LARGE = 'SavedObjectsClient/requestEntityTooLarge';
// 404 - Not Found
const CODE_NOT_FOUND = 'SavedObjectsClient/notFound';
// 409 - Conflict
const CODE_CONFLICT = 'SavedObjectsClient/conflict';
// 429 - Too Many Requests
const CODE_TOO_MANY_REQUESTS = 'SavedObjectsClient/tooManyRequests';
// 400 - Es Cannot Execute Script
const CODE_ES_CANNOT_EXECUTE_SCRIPT = 'SavedObjectsClient/esCannotExecuteScript';
// 503 - Es Unavailable
const CODE_ES_UNAVAILABLE = 'SavedObjectsClient/esUnavailable';
// 500 - General Error
const CODE_GENERAL_ERROR = 'SavedObjectsClient/generalError';

const code = Symbol('SavedObjectsClientErrorCode');

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

/**
 * Decorates an error - adds information or additional explanation of an error to
 * provide more context.
 *
 */
function decorate(
  error: Error | DecoratedError,
  errorCode: string,
  statusCode: number,
  message?: string
): DecoratedError {
  if (isSavedObjectsClientError(error)) {
    return error;
  }

  const boom = Boom.boomify(error, {
    statusCode,
    message,
    override: false,
  }) as DecoratedError;

  boom[code] = errorCode;

  return boom;
}

/**
 * Determines if an error is a saved objects client error
 */
function isSavedObjectsClientError(error: any): error is DecoratedError {
  return Boolean(error && error[code]);
}

/**
 * Decorates an bad request error to add information or additional explanation of an error to
 * provide more context. Bad requests come in a few flavors: unsupported type, invalid version,
 * elastic search cannot execute script, or plain vanilla bad request.
 */
function decorateBadRequestError(error: Error, reason?: string) {
  return decorate(error, CODE_BAD_REQUEST, 400, reason);
}

/**
 * The SavedObjectsErrorHelpers class is a simple class for creating, decorating, and
 * qualifying saved object errors.
 * @public
 */
export class SavedObjectsErrorHelpers {
  /**
   * Determines if an error is a saved objects client error
   * @public
   * @param error the error to check
   * @returns boolean - true if error is a saved objects client error
   */
  public static isSavedObjectsClientError(error: any): error is DecoratedError {
    return isSavedObjectsClientError(error);
  }

  /**
   * Decorates a bad request error (400) by adding a reason
   * @public
   * @param error the error to decorate
   * @param reason the reason for the bad request (optional)
   * @returns the decorated error
   */
  public static decorateBadRequestError(error: Error, reason?: string) {
    return decorateBadRequestError(error, reason);
  }

  /**
   * Creates a decorated bad request error (400). Bad requests come in a few flavors:
   * unsupported type, invalid version, elastic search cannot execute script, or plain
   * vanilla bad request.
   * @public
   * @param reason the reason for the bad request (optional)
   * @returns the decorated error
   */
  public static createBadRequestError(reason?: string) {
    return decorateBadRequestError(new Error('Bad Request'), reason);
  }

  /**
   * Creates a decorated unsupported type error (flavor of bad request 400)
   * @public
   * @param type the unsupported saved object type
   * @returns the decorated error
   */
  public static createUnsupportedTypeError(type: string) {
    return decorateBadRequestError(
      new Error('Bad Request'),
      `Unsupported saved object type: '${type}'`
    );
  }

  /**
   * Determines if an error is a bad request error (400)
   * @public
   * @param error the error or decorated error
   * @returns boolean - true if error is a bad request error
   */
  public static isBadRequestError(error: Error | DecoratedError) {
    return isSavedObjectsClientError(error) && error[code] === CODE_BAD_REQUEST;
  }

  /**
   * Creates a decorated invalid version error (flavor of bad request 400)
   * @public
   * @param versionInput the version string (optional)
   * @returns the decorated error
   */
  public static createInvalidVersionError(versionInput?: string) {
    return decorate(
      Boom.badRequest(`Invalid version [${versionInput}]`),
      CODE_INVALID_VERSION,
      400
    );
  }

  /**
   * Determines if an error is an invalid version error (flavor of bad request 400)
   * @public
   * @param error the error or decorated error
   * @returns boolean - true if error is an invalid version error
   */
  public static isInvalidVersionError(error: Error | DecoratedError) {
    return isSavedObjectsClientError(error) && error[code] === CODE_INVALID_VERSION;
  }

  /**
   * Decorates an error as an not authorized error (401)
   * @public
   * @param error the error to decorate
   * @param reason the reason for the not authorized error (optional)
   * @returns the decorated error
   */
  public static decorateNotAuthorizedError(error: Error, reason?: string) {
    return decorate(error, CODE_NOT_AUTHORIZED, 401, reason);
  }

  /**
   * Determines if an error is a not authorized error (401)
   * @public
   * @param error the error or decorated error
   * @returns boolean - true if error is a not authorized error
   */
  public static isNotAuthorizedError(error: Error | DecoratedError) {
    return isSavedObjectsClientError(error) && error[code] === CODE_NOT_AUTHORIZED;
  }

  /**
   * Decorates an error as a forbidden error (403)
   * @public
   * @param error the error to decorate
   * @param reason the reason for the forbidden error (optional)
   * @returns the decorated error
   */
  public static decorateForbiddenError(error: Error, reason?: string) {
    return decorate(error, CODE_FORBIDDEN, 403, reason);
  }

  /**
   * Determines if an error is a forbidden error (403)
   * @public
   * @param error the error or decorated error
   * @returns boolean - true if error is a forbidden error
   */
  public static isForbiddenError(error: Error | DecoratedError) {
    return isSavedObjectsClientError(error) && error[code] === CODE_FORBIDDEN;
  }

  /**
   * Decorates a request entity too large error (413)
   * @public
   * @param error the error to decorate
   * @param reason the reason for the request entity too large error
   * @returns the decorated error
   */
  public static decorateRequestEntityTooLargeError(error: Error, reason?: string) {
    return decorate(error, CODE_REQUEST_ENTITY_TOO_LARGE, 413, reason);
  }

  /**
   * Determines if an error is a request entity too large error(413)
   * @public
   * @param error the error or decorated error
   * @returns boolean - true if error is a request entity too large error
   */
  public static isRequestEntityTooLargeError(error: Error | DecoratedError) {
    return isSavedObjectsClientError(error) && error[code] === CODE_REQUEST_ENTITY_TOO_LARGE;
  }

  /**
   * Creates a generic not found error (404)
   * @public
   * @param type the saved object type or null (default is null)
   * @param id the saved object id or null (default is null)
   * @returns the decorated error
   */
  public static createGenericNotFoundError(type: string | null = null, id: string | null = null) {
    if (type && id) {
      return decorate(Boom.notFound(`Saved object [${type}/${id}] not found`), CODE_NOT_FOUND, 404);
    }
    return decorate(Boom.notFound(), CODE_NOT_FOUND, 404);
  }

  /**
   * Creates an alias not found error (flavor of general error 500)
   * @public
   * @param alias the unfound saved object alias
   * @returns the decorated error
   */
  public static createIndexAliasNotFoundError(alias: string) {
    return SavedObjectsErrorHelpers.decorateIndexAliasNotFoundError(Boom.internal(), alias);
  }

  /**
   * Decorates an index alias not found error (flavor of general error 500)
   * @public
   * @param error the error to decorate
   * @param alias the unfound index alias
   * @returns the decorated error
   */
  public static decorateIndexAliasNotFoundError(error: Error, alias: string) {
    return decorate(
      error,
      CODE_GENERAL_ERROR,
      500,
      `Saved object index alias [${alias}] not found`
    );
  }

  /**
   * Determines if an error is a not found error (404)
   * @public
   * @param error the error or decorated error
   * @returns boolean - true if error is a not found error
   */
  public static isNotFoundError(error: Error | DecoratedError) {
    return isSavedObjectsClientError(error) && error[code] === CODE_NOT_FOUND;
  }

  /**
   * Decorates a conflict error (409)
   * @public
   * @param error the error to decorate
   * @param reason the reason for the conflict error (optional)
   * @returns the decorated error
   */
  public static decorateConflictError(error: Error, reason?: string) {
    return decorate(error, CODE_CONFLICT, 409, reason);
  }

  /**
   * Creates a conflict error (409)
   * @public
   * @param type the saved object type
   * @param id the saved object id
   * @param reason the reason for the conflict error (optional)
   * @returns the decorated error
   */
  public static createConflictError(type: string, id: string, reason?: string) {
    return SavedObjectsErrorHelpers.decorateConflictError(
      Boom.conflict(`Saved object [${type}/${id}] conflict`),
      reason
    );
  }

  /**
   * Determines if an error is a conflict error (409)
   * @public
   * @param error the error or decorated error
   * @returns boolean - true if error is a conflict error
   */
  public static isConflictError(error: Error | DecoratedError) {
    return isSavedObjectsClientError(error) && error[code] === CODE_CONFLICT;
  }

  /**
   * Decorates a too many requests error (429)
   * @public
   * @param error the error to decorate
   * @param reason the reason for the too many requests error (optional)
   * @returns the decorated error
   */
  public static decorateTooManyRequestsError(error: Error, reason?: string) {
    return decorate(error, CODE_TOO_MANY_REQUESTS, 429, reason);
  }

  /**
   * Creates a too many requests error (429)
   * @public
   * @param type the saved object type
   * @param id the saved object id
   * @returns the decorated error
   */
  public static createTooManyRequestsError(type: string, id: string) {
    return SavedObjectsErrorHelpers.decorateTooManyRequestsError(Boom.tooManyRequests());
  }

  /**
   * Determines if an error is a too many requests error (429)
   * @public
   * @param error the error or decorated error
   * @returns boolean - true if error is a too many requests error
   */
  public static isTooManyRequestsError(error: Error | DecoratedError) {
    return isSavedObjectsClientError(error) && error[code] === CODE_TOO_MANY_REQUESTS;
  }

  /**
   * Decorates an elastic search cannot execute script error (flavor of 400)
   * @public
   * @param error the error to decorate
   * @param reason the reason for the cannot execute error (optional)
   * @returns the decorated error
   */
  public static decorateEsCannotExecuteScriptError(error: Error, reason?: string) {
    return decorate(error, CODE_ES_CANNOT_EXECUTE_SCRIPT, 400, reason);
  }

  /**
   * Determines if an error is an elastic search cannot execute script error (flavor of 400)
   * @public
   * @param error the error or decorated error
   * @returns boolean - true if error is a cannot execute error
   */
  public static isEsCannotExecuteScriptError(error: Error | DecoratedError) {
    return isSavedObjectsClientError(error) && error[code] === CODE_ES_CANNOT_EXECUTE_SCRIPT;
  }

  /**
   * Decorates an elastic search unavailable error (503)
   * @public
   * @param error the error to decorate
   * @param reason the reason for the elastic search unavailable error (optional)
   * @returns the decorated error
   */
  public static decorateEsUnavailableError(error: Error, reason?: string) {
    return decorate(error, CODE_ES_UNAVAILABLE, 503, reason);
  }

  /**
   * Determines if an error is an elastic search unavailable error (flavor of 400)
   * @public
   * @param error the error or decorated error
   * @returns boolean - true if error is an elastic search unavailable error
   */
  public static isEsUnavailableError(error: Error | DecoratedError) {
    return isSavedObjectsClientError(error) && error[code] === CODE_ES_UNAVAILABLE;
  }

  /**
   * Decorates a general error (500)
   * @public
   * @param error the error to decorate
   * @param reason the reason for the error (optional)
   * @returns the decorated error
   */
  public static decorateGeneralError(error: Error, reason?: string) {
    return decorate(error, CODE_GENERAL_ERROR, 500, reason);
  }

  /**
   * Determines if an error is a general error (500)
   * @public
   * @param error the error or decorated error
   * @returns boolean - true if error is a general error
   */
  public static isGeneralError(error: Error | DecoratedError) {
    return isSavedObjectsClientError(error) && error[code] === CODE_GENERAL_ERROR;
  }

  /**
   * Creates a generic elastic search not present error
   * @public
   * @param type the saved object type or null, default null
   * @param id the saved object id or null, default null
   * @returns the decorated error
   */
  public static createGenericNotFoundEsUnavailableError(
    // type and id not available in all operations (e.g. mget)
    type: string | null = null,
    id: string | null = null
  ) {
    const notFoundError = this.createGenericNotFoundError(type, id);
    return this.decorateEsUnavailableError(
      new Error(`${notFoundError.message}`),
      `x-elastic-product not present or not recognized`
    );
  }
}
