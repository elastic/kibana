/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock } from '@kbn/core/server/mocks';

import { BULK_OPERATIONS_MAX_SIZE, registerLookupIndexRoutes } from './lookup_index';

describe('lookup_index routes', () => {
  const getUpdateRouteValidate = () => {
    const router = coreMock.createSetup().http.createRouter();
    registerLookupIndexRoutes(router, coreMock.createPluginInitializerContext());

    const updateCall = (router.post as jest.Mock).mock.calls.find(
      ([config]) => config.path === '/internal/esql/lookup_index/{indexName}/update'
    );

    if (!updateCall) {
      throw new Error('update route was not registered');
    }

    return updateCall[0].validate;
  };

  describe('POST /internal/esql/lookup_index/{indexName}/update body validation', () => {
    it('accepts an operations array within the maxSize limit', () => {
      const validate = getUpdateRouteValidate();
      const operations = Array.from({ length: BULK_OPERATIONS_MAX_SIZE }, (_, i) => ({
        index: { _id: String(i) },
      }));

      expect(() => validate.body.validate({ operations })).not.toThrow();
    });

    it('rejects an operations array that exceeds the maxSize limit', () => {
      const validate = getUpdateRouteValidate();
      const operations = Array.from({ length: BULK_OPERATIONS_MAX_SIZE + 1 }, (_, i) => ({
        index: { _id: String(i) },
      }));

      expect(() => validate.body.validate({ operations })).toThrow(
        new RegExp(
          `array size is \\[${
            BULK_OPERATIONS_MAX_SIZE + 1
          }\\], but cannot be greater than \\[${BULK_OPERATIONS_MAX_SIZE}\\]`
        )
      );
    });
  });
});
