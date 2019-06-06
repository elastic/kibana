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

const code = Symbol('SavedObjectsClientErrorCode');

interface DecoratedError extends Boom {
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

export function isSavedObjectsClientError(error: any): error is DecoratedError {
  return Boolean(error && error[code]);
}

// 400 - badRequest
const CODE_BAD_REQUEST = 'SavedObjectsClient/badRequest';
export function decorateBadRequestError(error: Error, reason?: string) {
  return decorate(error, CODE_BAD_REQUEST, 400, reason);
}
export function createBadRequestError(reason?: string) {
  return decorateBadRequestError(new Error('Bad Request'), reason);
}
export function createUnsupportedTypeError(type: string) {
  return createBadRequestError(`Unsupported saved object type: '${type}'`);
}
export function isBadRequestError(error: Error | DecoratedError) {
  return isSavedObjectsClientError(error) && error[code] === CODE_BAD_REQUEST;
}

// 400 - invalid version
const CODE_INVALID_VERSION = 'SavedObjectsClient/invalidVersion';
export function createInvalidVersionError(versionInput?: string) {
  return decorate(Boom.badRequest(`Invalid version [${versionInput}]`), CODE_INVALID_VERSION, 400);
}
export function isInvalidVersionError(error: Error | DecoratedError) {
  return isSavedObjectsClientError(error) && error[code] === CODE_INVALID_VERSION;
}

// 401 - Not Authorized
const CODE_NOT_AUTHORIZED = 'SavedObjectsClient/notAuthorized';
export function decorateNotAuthorizedError(error: Error, reason?: string) {
  return decorate(error, CODE_NOT_AUTHORIZED, 401, reason);
}
export function isNotAuthorizedError(error: Error | DecoratedError) {
  return isSavedObjectsClientError(error) && error[code] === CODE_NOT_AUTHORIZED;
}

// 403 - Forbidden
const CODE_FORBIDDEN = 'SavedObjectsClient/forbidden';
export function decorateForbiddenError(error: Error, reason?: string) {
  return decorate(error, CODE_FORBIDDEN, 403, reason);
}
export function isForbiddenError(error: Error | DecoratedError) {
  return isSavedObjectsClientError(error) && error[code] === CODE_FORBIDDEN;
}

// 413 - Request Entity Too Large
const CODE_REQUEST_ENTITY_TOO_LARGE = 'SavedObjectsClient/requestEntityTooLarge';
export function decorateRequestEntityTooLargeError(error: Error, reason?: string) {
  return decorate(error, CODE_REQUEST_ENTITY_TOO_LARGE, 413, reason);
}
export function isRequestEntityTooLargeError(error: Error | DecoratedError) {
  return isSavedObjectsClientError(error) && error[code] === CODE_REQUEST_ENTITY_TOO_LARGE;
}

// 404 - Not Found
const CODE_NOT_FOUND = 'SavedObjectsClient/notFound';
export function createGenericNotFoundError(type: string | null = null, id: string | null = null) {
  if (type && id) {
    return decorate(Boom.notFound(`Saved object [${type}/${id}] not found`), CODE_NOT_FOUND, 404);
  }
  return decorate(Boom.notFound(), CODE_NOT_FOUND, 404);
}
export function isNotFoundError(error: Error | DecoratedError) {
  return isSavedObjectsClientError(error) && error[code] === CODE_NOT_FOUND;
}

// 409 - Conflict
const CODE_CONFLICT = 'SavedObjectsClient/conflict';
export function decorateConflictError(error: Error, reason?: string) {
  return decorate(error, CODE_CONFLICT, 409, reason);
}
export function isConflictError(error: Error | DecoratedError) {
  return isSavedObjectsClientError(error) && error[code] === CODE_CONFLICT;
}

// 503 - Es Unavailable
const CODE_ES_UNAVAILABLE = 'SavedObjectsClient/esUnavailable';
export function decorateEsUnavailableError(error: Error, reason?: string) {
  return decorate(error, CODE_ES_UNAVAILABLE, 503, reason);
}
export function isEsUnavailableError(error: Error | DecoratedError) {
  return isSavedObjectsClientError(error) && error[code] === CODE_ES_UNAVAILABLE;
}

// 503 - Unable to automatically create index because of action.auto_create_index setting
const CODE_ES_AUTO_CREATE_INDEX_ERROR = 'SavedObjectsClient/autoCreateIndex';
export function createEsAutoCreateIndexError() {
  const error = Boom.serverUnavailable('Automatic index creation failed');
  error.output.payload.attributes = error.output.payload.attributes || {};
  error.output.payload.attributes.code = 'ES_AUTO_CREATE_INDEX_ERROR';

  return decorate(error, CODE_ES_AUTO_CREATE_INDEX_ERROR, 503);
}
export function isEsAutoCreateIndexError(error: Error | DecoratedError) {
  return isSavedObjectsClientError(error) && error[code] === CODE_ES_AUTO_CREATE_INDEX_ERROR;
}

// 500 - General Error
const CODE_GENERAL_ERROR = 'SavedObjectsClient/generalError';
export function decorateGeneralError(error: Error, reason?: string) {
  return decorate(error, CODE_GENERAL_ERROR, 500, reason);
}
