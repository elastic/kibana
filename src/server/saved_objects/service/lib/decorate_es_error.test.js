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

import { errors as esErrors } from '@elastic/elasticsearch';

import { decorateEsError } from './decorate_es_error';
import {
  isEsUnavailableError,
  isConflictError,
  isNotAuthorizedError,
  isForbiddenError,
  isRequestEntityTooLargeError,
  isNotFoundError,
  isBadRequestError,
} from './errors';

describe('savedObjectsClient/decorateEsError', () => {
  it('always returns the same error it receives', () => {
    const error = new Error();
    expect(decorateEsError(error)).toBe(error);
  });

  it('makes es.ConnectionFault a SavedObjectsClient/EsUnavailable error', () => {
    const error = new esErrors.ConnectionError();
    expect(isEsUnavailableError(error)).toBe(false);
    expect(decorateEsError(error)).toBe(error);
    expect(isEsUnavailableError(error)).toBe(true);
  });

  it('makes es.ServiceUnavailable a SavedObjectsClient/EsUnavailable error', () => {
    const error = new esErrors.ResponseError({ statusCode: 503 });
    expect(isEsUnavailableError(error)).toBe(false);
    expect(decorateEsError(error)).toBe(error);
    expect(isEsUnavailableError(error)).toBe(true);
  });

  it('makes es.NoConnections a SavedObjectsClient/EsUnavailable error', () => {
    const error = new esErrors.NoLivingConnectionsError();
    expect(isEsUnavailableError(error)).toBe(false);
    expect(decorateEsError(error)).toBe(error);
    expect(isEsUnavailableError(error)).toBe(true);
  });

  it('makes es.RequestTimeout a SavedObjectsClient/EsUnavailable error', () => {
    const error = new esErrors.TimeoutError();
    expect(isEsUnavailableError(error)).toBe(false);
    expect(decorateEsError(error)).toBe(error);
    expect(isEsUnavailableError(error)).toBe(true);
  });

  it('makes es.Conflict a SavedObjectsClient/Conflict error', () => {
    const error = new esErrors.ResponseError({ statusCode: 409 });
    expect(isConflictError(error)).toBe(false);
    expect(decorateEsError(error)).toBe(error);
    expect(isConflictError(error)).toBe(true);
  });

  it('makes es.AuthenticationException a SavedObjectsClient/NotAuthorized error', () => {
    const error = new esErrors.ResponseError({ statusCode: 401 });
    expect(isNotAuthorizedError(error)).toBe(false);
    expect(decorateEsError(error)).toBe(error);
    expect(isNotAuthorizedError(error)).toBe(true);
  });

  it('makes es.Forbidden a SavedObjectsClient/Forbidden error', () => {
    const error = new esErrors.ResponseError({ statusCode: 403 });
    expect(isForbiddenError(error)).toBe(false);
    expect(decorateEsError(error)).toBe(error);
    expect(isForbiddenError(error)).toBe(true);
  });

  it('makes es.RequestEntityTooLarge a SavedObjectsClient/RequestEntityTooLarge error', () => {
    const error = new esErrors.ResponseError({ statusCode: 413 });
    expect(isRequestEntityTooLargeError(error)).toBe(false);
    expect(decorateEsError(error)).toBe(error);
    expect(isRequestEntityTooLargeError(error)).toBe(true);
  });

  it('discards es.NotFound errors and returns a generic NotFound error', () => {
    const error = new esErrors.ResponseError({ statusCode: 404 });
    expect(isNotFoundError(error)).toBe(false);
    const genericError = decorateEsError(error);
    expect(genericError).not.toBe(error);
    expect(isNotFoundError(error)).toBe(false);
    expect(isNotFoundError(genericError)).toBe(true);
  });

  it('makes es.BadRequest a SavedObjectsClient/BadRequest error', () => {
    const error = new esErrors.ResponseError({ statusCode: 400 });
    expect(isBadRequestError(error)).toBe(false);
    expect(decorateEsError(error)).toBe(error);
    expect(isBadRequestError(error)).toBe(true);
  });

  it('returns other errors as Boom errors', () => {
    const error = new Error();
    expect(error).not.toHaveProperty('isBoom');
    expect(decorateEsError(error)).toBe(error);
    expect(error).toHaveProperty('isBoom');
  });
});
