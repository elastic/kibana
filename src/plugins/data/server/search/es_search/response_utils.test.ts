/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getTotalLoaded, toKibanaSearchResponse } from './response_utils';
import { SearchResponse } from 'elasticsearch';

describe('response utils', () => {
  describe('getTotalLoaded', () => {
    it('returns the total/loaded, not including skipped', () => {
      const result = getTotalLoaded(({
        _shards: {
          successful: 10,
          failed: 5,
          skipped: 5,
          total: 100,
        },
      } as unknown) as SearchResponse<unknown>);

      expect(result).toEqual({
        total: 100,
        loaded: 15,
      });
    });
  });

  describe('toKibanaSearchResponse', () => {
    it('returns rawResponse, isPartial, isRunning, total, and loaded', () => {
      const result = toKibanaSearchResponse(({
        _shards: {
          successful: 10,
          failed: 5,
          skipped: 5,
          total: 100,
        },
      } as unknown) as SearchResponse<unknown>);

      expect(result).toEqual({
        rawResponse: {
          _shards: {
            successful: 10,
            failed: 5,
            skipped: 5,
            total: 100,
          },
        },
        isRunning: false,
        isPartial: false,
        total: 100,
        loaded: 15,
      });
    });
  });
});
