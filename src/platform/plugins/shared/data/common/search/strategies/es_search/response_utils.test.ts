/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getTotalLoaded, shimHitsTotal } from './response_utils';
import type { estypes } from '@elastic/elasticsearch';

describe('response utils', () => {
  describe('getTotalLoaded', () => {
    it('returns the total/loaded, not including skipped', () => {
      const result = getTotalLoaded({
        _shards: {
          successful: 10,
          failed: 5,
          skipped: 5,
          total: 100,
        },
      } as unknown as estypes.SearchResponse<unknown>);

      expect(result).toEqual({
        total: 100,
        loaded: 15,
      });
    });
  });

  describe('shimHitsTotal', () => {
    test('returns the total if it is already numeric', () => {
      const result = shimHitsTotal({
        hits: {
          total: 5,
        },
      } as any);
      expect(result).toEqual({
        hits: {
          total: 5,
        },
      });
    });

    test('returns the total if it is inside `value`', () => {
      const result = shimHitsTotal({
        hits: {
          total: {
            value: 5,
          },
        },
      } as any);
      expect(result).toEqual({
        hits: {
          total: 5,
        },
      });
    });

    test('returns other properties from the response', () => {
      const result = shimHitsTotal({
        _shards: {},
        hits: {
          hits: [],
          total: {
            value: 5,
          },
        },
      } as any);
      expect(result).toEqual({
        _shards: {},
        hits: {
          hits: [],
          total: 5,
        },
      });
    });

    test('returns the response as-is if `legacyHitsTotal` is `false`', () => {
      const result = shimHitsTotal(
        {
          _shards: {},
          hits: {
            hits: [],
            total: {
              value: 5,
              relation: 'eq',
            },
          },
        } as any,
        { legacyHitsTotal: false }
      );
      expect(result).toEqual({
        _shards: {},
        hits: {
          hits: [],
          total: {
            value: 5,
            relation: 'eq',
          },
        },
      });
    });
  });
});
