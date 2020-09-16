/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Boom from 'boom';

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

export interface DecoratedError extends Boom {
  [code]?: string;
}

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

function isSavedObjectsClientError(error: any): error is DecoratedError {
  return Boolean(error && error[code]);
}

function decorateBadRequestError(error: Error, reason?: string) {
  return decorate(error, CODE_BAD_REQUEST, 400, reason);
}

/**
 * @public
 */
export class SavedObjectsErrorHelpers {
  public static isSavedObjectsClientError(error: any): error is DecoratedError {
    return isSavedObjectsClientError(error);
  }

  public static decorateBadRequestError(error: Error, reason?: string) {
    return decorateBadRequestError(error, reason);
  }

  public static createBadRequestError(reason?: string) {
    return decorateBadRequestError(new Error('Bad Request'), reason);
  }

  public static createUnsupportedTypeError(type: string) {
    return decorateBadRequestError(
      new Error('Bad Request'),
      `Unsupported saved object type: '${type}'`
    );
  }

  public static isBadRequestError(error: Error | DecoratedError) {
    return isSavedObjectsClientError(error) && error[code] === CODE_BAD_REQUEST;
  }

  public static createInvalidVersionError(versionInput?: string) {
    return decorate(
      Boom.badRequest(`Invalid version [${versionInput}]`),
      CODE_INVALID_VERSION,
      400
    );
  }

  public static isInvalidVersionError(error: Error | DecoratedError) {
    return isSavedObjectsClientError(error) && error[code] === CODE_INVALID_VERSION;
  }

  public static decorateNotAuthorizedError(error: Error, reason?: string) {
    return decorate(error, CODE_NOT_AUTHORIZED, 401, reason);
  }

  public static isNotAuthorizedError(error: Error | DecoratedError) {
    return isSavedObjectsClientError(error) && error[code] === CODE_NOT_AUTHORIZED;
  }

  public static decorateForbiddenError(error: Error, reason?: string) {
    return decorate(error, CODE_FORBIDDEN, 403, reason);
  }

  public static isForbiddenError(error: Error | DecoratedError) {
    return isSavedObjectsClientError(error) && error[code] === CODE_FORBIDDEN;
  }

  public static decorateRequestEntityTooLargeError(error: Error, reason?: string) {
    return decorate(error, CODE_REQUEST_ENTITY_TOO_LARGE, 413, reason);
  }
  public static isRequestEntityTooLargeError(error: Error | DecoratedError) {
    return isSavedObjectsClientError(error) && error[code] === CODE_REQUEST_ENTITY_TOO_LARGE;
  }

  public static createGenericNotFoundError(type: string | null = null, id: string | null = null) {
    if (type && id) {
      return decorate(Boom.notFound(`Saved object [${type}/${id}] not found`), CODE_NOT_FOUND, 404);
    }
    return decorate(Boom.notFound(), CODE_NOT_FOUND, 404);
  }

  public static isNotFoundError(error: Error | DecoratedError) {
    return isSavedObjectsClientError(error) && error[code] === CODE_NOT_FOUND;
  }

  public static decorateConflictError(error: Error, reason?: string) {
    return decorate(error, CODE_CONFLICT, 409, reason);
  }

  public static createConflictError(type: string, id: string) {
    return SavedObjectsErrorHelpers.decorateConflictError(
      Boom.conflict(`Saved object [${type}/${id}] conflict`)
    );
  }

  public static isConflictError(error: Error | DecoratedError) {
    return isSavedObjectsClientError(error) && error[code] === CODE_CONFLICT;
  }

  public static decorateTooManyRequestsError(error: Error, reason?: string) {
    return decorate(error, CODE_TOO_MANY_REQUESTS, 429, reason);
  }

  public static createTooManyRequestsError(type: string, id: string) {
    return SavedObjectsErrorHelpers.decorateTooManyRequestsError(Boom.tooManyRequests());
  }

  public static isTooManyRequestsError(error: Error | DecoratedError) {
    return isSavedObjectsClientError(error) && error[code] === CODE_TOO_MANY_REQUESTS;
  }

  public static decorateEsCannotExecuteScriptError(error: Error, reason?: string) {
    return decorate(error, CODE_ES_CANNOT_EXECUTE_SCRIPT, 400, reason);
  }

  public static isEsCannotExecuteScriptError(error: Error | DecoratedError) {
    return isSavedObjectsClientError(error) && error[code] === CODE_ES_CANNOT_EXECUTE_SCRIPT;
  }

  public static decorateEsUnavailableError(error: Error, reason?: string) {
    return decorate(error, CODE_ES_UNAVAILABLE, 503, reason);
  }

  public static isEsUnavailableError(error: Error | DecoratedError) {
    return isSavedObjectsClientError(error) && error[code] === CODE_ES_UNAVAILABLE;
  }

  public static decorateGeneralError(error: Error, reason?: string) {
    return decorate(error, CODE_GENERAL_ERROR, 500, reason);
  }
}
