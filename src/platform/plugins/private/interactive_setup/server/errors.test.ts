/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors as esErrors } from '@elastic/elasticsearch';

import * as errors from './errors';
import { interactiveSetupMock } from './mocks';

describe('errors', () => {
  describe('#getErrorStatusCode', () => {
    it('extracts status code from Elasticsearch client response error', () => {
      expect(
        errors.getErrorStatusCode(
          new esErrors.ResponseError(
            interactiveSetupMock.createApiResponse({ statusCode: 400, body: {} })
          )
        )
      ).toBe(400);
      expect(
        errors.getErrorStatusCode(
          new esErrors.ResponseError(
            interactiveSetupMock.createApiResponse({ statusCode: 401, body: {} })
          )
        )
      ).toBe(401);
    });

    it('extracts status code from `status` property', () => {
      expect(errors.getErrorStatusCode({ statusText: 'Bad Request', status: 400 })).toBe(400);
      expect(errors.getErrorStatusCode({ statusText: 'Unauthorized', status: 401 })).toBe(401);
    });
  });

  describe('#getDetailedErrorMessage', () => {
    it('extracts body from Elasticsearch client response error', () => {
      expect(
        errors.getDetailedErrorMessage(
          new esErrors.ResponseError(
            interactiveSetupMock.createApiResponse({
              statusCode: 401,
              body: { field1: 'value-1', field2: 'value-2' },
            })
          )
        )
      ).toBe(JSON.stringify({ field1: 'value-1', field2: 'value-2' }));
    });

    it('extracts `message` property', () => {
      expect(errors.getDetailedErrorMessage(new Error('some-message'))).toBe('some-message');
    });
  });
});
