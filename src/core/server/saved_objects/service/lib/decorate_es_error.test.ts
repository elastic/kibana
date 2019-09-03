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

import { errors as esErrors } from 'elasticsearch';

import { decorateEsError } from './decorate_es_error';
import { SavedObjectsErrorHelpers } from './errors';

describe('savedObjectsClient/decorateEsError', () => {
  it('always returns the same error it receives', () => {
    const error = new Error();
    expect(decorateEsError(error)).toBe(error);
  });

  it('makes es.ConnectionFault a SavedObjectsClient/EsUnavailable error', () => {
    const error = new esErrors.ConnectionFault();
    expect(SavedObjectsErrorHelpers.isEsUnavailableError(error)).toBe(false);
    expect(decorateEsError(error)).toBe(error);
    expect(SavedObjectsErrorHelpers.isEsUnavailableError(error)).toBe(true);
  });

  it('makes es.ServiceUnavailable a SavedObjectsClient/EsUnavailable error', () => {
    const error = new esErrors.ServiceUnavailable();
    expect(SavedObjectsErrorHelpers.isEsUnavailableError(error)).toBe(false);
    expect(decorateEsError(error)).toBe(error);
    expect(SavedObjectsErrorHelpers.isEsUnavailableError(error)).toBe(true);
  });

  it('makes es.NoConnections a SavedObjectsClient/EsUnavailable error', () => {
    const error = new esErrors.NoConnections();
    expect(SavedObjectsErrorHelpers.isEsUnavailableError(error)).toBe(false);
    expect(decorateEsError(error)).toBe(error);
    expect(SavedObjectsErrorHelpers.isEsUnavailableError(error)).toBe(true);
  });

  it('makes es.RequestTimeout a SavedObjectsClient/EsUnavailable error', () => {
    const error = new esErrors.RequestTimeout();
    expect(SavedObjectsErrorHelpers.isEsUnavailableError(error)).toBe(false);
    expect(decorateEsError(error)).toBe(error);
    expect(SavedObjectsErrorHelpers.isEsUnavailableError(error)).toBe(true);
  });

  it('makes es.Conflict a SavedObjectsClient/Conflict error', () => {
    const error = new esErrors.Conflict();
    expect(SavedObjectsErrorHelpers.isConflictError(error)).toBe(false);
    expect(decorateEsError(error)).toBe(error);
    expect(SavedObjectsErrorHelpers.isConflictError(error)).toBe(true);
  });

  it('makes es.AuthenticationException a SavedObjectsClient/NotAuthorized error', () => {
    const error = new esErrors.AuthenticationException();
    expect(SavedObjectsErrorHelpers.isNotAuthorizedError(error)).toBe(false);
    expect(decorateEsError(error)).toBe(error);
    expect(SavedObjectsErrorHelpers.isNotAuthorizedError(error)).toBe(true);
  });

  it('makes es.Forbidden a SavedObjectsClient/Forbidden error', () => {
    const error = new esErrors.Forbidden();
    expect(SavedObjectsErrorHelpers.isForbiddenError(error)).toBe(false);
    expect(decorateEsError(error)).toBe(error);
    expect(SavedObjectsErrorHelpers.isForbiddenError(error)).toBe(true);
  });

  it('makes es.RequestEntityTooLarge a SavedObjectsClient/RequestEntityTooLarge error', () => {
    const error = new esErrors.RequestEntityTooLarge();
    expect(SavedObjectsErrorHelpers.isRequestEntityTooLargeError(error)).toBe(false);
    expect(decorateEsError(error)).toBe(error);
    expect(SavedObjectsErrorHelpers.isRequestEntityTooLargeError(error)).toBe(true);
  });

  it('discards es.NotFound errors and returns a generic NotFound error', () => {
    const error = new esErrors.NotFound();
    expect(SavedObjectsErrorHelpers.isNotFoundError(error)).toBe(false);
    const genericError = decorateEsError(error);
    expect(genericError).not.toBe(error);
    expect(SavedObjectsErrorHelpers.isNotFoundError(error)).toBe(false);
    expect(SavedObjectsErrorHelpers.isNotFoundError(genericError)).toBe(true);
  });

  it('makes es.BadRequest a SavedObjectsClient/BadRequest error', () => {
    const error = new esErrors.BadRequest();
    expect(SavedObjectsErrorHelpers.isBadRequestError(error)).toBe(false);
    expect(decorateEsError(error)).toBe(error);
    expect(SavedObjectsErrorHelpers.isBadRequestError(error)).toBe(true);
  });

  it('returns other errors as Boom errors', () => {
    const error = new Error();
    expect(error).not.toHaveProperty('isBoom');
    expect(decorateEsError(error)).toBe(error);
    expect(error).toHaveProperty('isBoom');
  });
});
