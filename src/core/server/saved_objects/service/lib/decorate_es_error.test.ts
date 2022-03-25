/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { errors as esErrors } from '@elastic/elasticsearch';
import { elasticsearchClientMock } from '../../../elasticsearch/client/mocks';
import { decorateEsError } from './decorate_es_error';
import { SavedObjectsErrorHelpers } from './errors';

describe('savedObjectsClient/decorateEsError', () => {
  it('always returns the same error it receives', () => {
    const error = new esErrors.ResponseError(elasticsearchClientMock.createApiResponse());
    expect(decorateEsError(error)).toBe(error);
  });

  it('makes ConnectionError a SavedObjectsClient/EsUnavailable error', () => {
    const error = new esErrors.ConnectionError(
      'reason',
      elasticsearchClientMock.createApiResponse()
    );
    expect(SavedObjectsErrorHelpers.isEsUnavailableError(error)).toBe(false);
    expect(decorateEsError(error)).toBe(error);
    expect(SavedObjectsErrorHelpers.isEsUnavailableError(error)).toBe(true);
  });

  it('makes ServiceUnavailable a SavedObjectsClient/EsUnavailable error', () => {
    const error = new esErrors.ResponseError(
      elasticsearchClientMock.createApiResponse({ statusCode: 503 })
    );
    expect(SavedObjectsErrorHelpers.isEsUnavailableError(error)).toBe(false);
    expect(decorateEsError(error)).toBe(error);
    expect(SavedObjectsErrorHelpers.isEsUnavailableError(error)).toBe(true);
  });

  it('makes NoLivingConnectionsError a SavedObjectsClient/EsUnavailable error', () => {
    const error = new esErrors.NoLivingConnectionsError(
      'reason',
      elasticsearchClientMock.createApiResponse()
    );
    expect(SavedObjectsErrorHelpers.isEsUnavailableError(error)).toBe(false);
    expect(decorateEsError(error)).toBe(error);
    expect(SavedObjectsErrorHelpers.isEsUnavailableError(error)).toBe(true);
  });

  it('makes TimeoutError a SavedObjectsClient/EsUnavailable error', () => {
    const error = new esErrors.TimeoutError('reason', elasticsearchClientMock.createApiResponse());
    expect(SavedObjectsErrorHelpers.isEsUnavailableError(error)).toBe(false);
    expect(decorateEsError(error)).toBe(error);
    expect(SavedObjectsErrorHelpers.isEsUnavailableError(error)).toBe(true);
  });

  it('makes Conflict a SavedObjectsClient/Conflict error', () => {
    const error = new esErrors.ResponseError(
      elasticsearchClientMock.createApiResponse({ statusCode: 409 })
    );
    expect(SavedObjectsErrorHelpers.isConflictError(error)).toBe(false);
    expect(decorateEsError(error)).toBe(error);
    expect(SavedObjectsErrorHelpers.isConflictError(error)).toBe(true);
  });

  it('makes TooManyRequests a SavedObjectsClient/tooManyRequests error', () => {
    const error = new esErrors.ResponseError(
      elasticsearchClientMock.createApiResponse({ statusCode: 429 })
    );
    expect(SavedObjectsErrorHelpers.isTooManyRequestsError(error)).toBe(false);
    expect(decorateEsError(error)).toBe(error);
    expect(SavedObjectsErrorHelpers.isTooManyRequestsError(error)).toBe(true);
  });

  it('makes NotAuthorized a SavedObjectsClient/NotAuthorized error', () => {
    const error = new esErrors.ResponseError(
      elasticsearchClientMock.createApiResponse({ statusCode: 401 })
    );
    expect(SavedObjectsErrorHelpers.isNotAuthorizedError(error)).toBe(false);
    expect(decorateEsError(error)).toBe(error);
    expect(SavedObjectsErrorHelpers.isNotAuthorizedError(error)).toBe(true);
  });

  it('makes Forbidden a SavedObjectsClient/Forbidden error', () => {
    const error = new esErrors.ResponseError(
      elasticsearchClientMock.createApiResponse({ statusCode: 403 })
    );
    expect(SavedObjectsErrorHelpers.isForbiddenError(error)).toBe(false);
    expect(decorateEsError(error)).toBe(error);
    expect(SavedObjectsErrorHelpers.isForbiddenError(error)).toBe(true);
  });

  it('makes RequestEntityTooLarge a SavedObjectsClient/RequestEntityTooLarge error', () => {
    const error = new esErrors.ResponseError(
      elasticsearchClientMock.createApiResponse({ statusCode: 413 })
    );
    expect(SavedObjectsErrorHelpers.isRequestEntityTooLargeError(error)).toBe(false);
    expect(decorateEsError(error)).toBe(error);
    expect(SavedObjectsErrorHelpers.isRequestEntityTooLargeError(error)).toBe(true);
  });

  it('discards NotFound errors and returns a generic NotFound error', () => {
    const error = new esErrors.ResponseError(
      elasticsearchClientMock.createApiResponse({ statusCode: 404 })
    );
    expect(SavedObjectsErrorHelpers.isNotFoundError(error)).toBe(false);
    const genericError = decorateEsError(error);
    expect(genericError).not.toBe(error);
    expect(SavedObjectsErrorHelpers.isNotFoundError(error)).toBe(false);
    expect(SavedObjectsErrorHelpers.isNotFoundError(genericError)).toBe(true);
  });

  it('makes NotFound errors generic NotFoundEsUnavailableError errors when response is from unsupported server', () => {
    const error = new esErrors.ResponseError(
      // explicitly override the headers
      elasticsearchClientMock.createApiResponse({ statusCode: 404, headers: {} })
    );
    expect(SavedObjectsErrorHelpers.isNotFoundError(error)).toBe(false);
    const genericError = decorateEsError(error);
    expect(genericError).not.toBe(error);
    expect(SavedObjectsErrorHelpers.isNotFoundError(genericError)).toBe(false);
    expect(SavedObjectsErrorHelpers.isEsUnavailableError(genericError)).toBe(true);
  });

  it('if saved objects index does not exist makes NotFound a SavedObjectsClient/generalError', () => {
    const error = new esErrors.ResponseError(
      elasticsearchClientMock.createApiResponse({
        statusCode: 404,
        body: {
          error: {
            reason:
              'no such index [.kibana_8.0.0] and [require_alias] request flag is [true] and [.kibana_8.0.0] is not an alias',
          },
        },
      })
    );
    expect(SavedObjectsErrorHelpers.isGeneralError(error)).toBe(false);
    const genericError = decorateEsError(error);
    expect(genericError.message).toEqual(
      `Saved object index alias [.kibana_8.0.0] not found: {\"error\":{\"reason\":\"no such index [.kibana_8.0.0] and [require_alias] request flag is [true] and [.kibana_8.0.0] is not an alias\"}}`
    );
    expect(genericError.output.statusCode).toBe(500);
    expect(SavedObjectsErrorHelpers.isGeneralError(error)).toBe(true);
  });

  it('makes BadRequest a SavedObjectsClient/BadRequest error', () => {
    const error = new esErrors.ResponseError(
      elasticsearchClientMock.createApiResponse({ statusCode: 400 })
    );
    expect(SavedObjectsErrorHelpers.isBadRequestError(error)).toBe(false);
    expect(decorateEsError(error)).toBe(error);
    expect(SavedObjectsErrorHelpers.isBadRequestError(error)).toBe(true);
  });

  describe('when es.BadRequest has a reason', () => {
    it('makes a SavedObjectsClient/esCannotExecuteScriptError error when script context is disabled', () => {
      const error = new esErrors.ResponseError(
        elasticsearchClientMock.createApiResponse({
          statusCode: 400,
          body: {
            error: {
              reason: 'cannot execute scripts using [update] context',
            },
          },
        })
      );
      expect(SavedObjectsErrorHelpers.isEsCannotExecuteScriptError(error)).toBe(false);
      expect(decorateEsError(error)).toBe(error);
      expect(SavedObjectsErrorHelpers.isEsCannotExecuteScriptError(error)).toBe(true);
      expect(SavedObjectsErrorHelpers.isBadRequestError(error)).toBe(false);
    });

    it('makes a SavedObjectsClient/esCannotExecuteScriptError error when inline scripts are disabled', () => {
      const error = new esErrors.ResponseError(
        elasticsearchClientMock.createApiResponse({
          statusCode: 400,
          body: {
            error: {
              reason: 'cannot execute [inline] scripts',
            },
          },
        })
      );
      expect(SavedObjectsErrorHelpers.isEsCannotExecuteScriptError(error)).toBe(false);
      expect(decorateEsError(error)).toBe(error);
      expect(SavedObjectsErrorHelpers.isEsCannotExecuteScriptError(error)).toBe(true);
      expect(SavedObjectsErrorHelpers.isBadRequestError(error)).toBe(false);
    });

    it('makes a SavedObjectsClient/BadRequest error for any other reason', () => {
      const error = new esErrors.ResponseError(
        elasticsearchClientMock.createApiResponse({ statusCode: 400 })
      );
      expect(SavedObjectsErrorHelpers.isBadRequestError(error)).toBe(false);
      expect(decorateEsError(error)).toBe(error);
      expect(SavedObjectsErrorHelpers.isBadRequestError(error)).toBe(true);
    });
  });

  it('returns other errors as Boom errors', () => {
    const error = new esErrors.ResponseError(elasticsearchClientMock.createApiResponse());
    expect(error).not.toHaveProperty('isBoom');
    expect(decorateEsError(error)).toBe(error);
    expect(error).toHaveProperty('isBoom');
  });
});
