/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getTotalLoaded, getHitsTotal } from './response_utils';
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

  describe('getHitsTotal', () => {
    describe('when hits.total is number', () => {
      it('should return it', () => {
        const hits = { total: 5 } as estypes.SearchHitsMetadata;
        expect(getHitsTotal(hits.total)).toBe(5);
      });
    });

    describe('when hits.total is object', () => {
      it('should return hits.total.value', () => {
        const hits = { total: { value: 10 } } as estypes.SearchHitsMetadata;
        expect(getHitsTotal(hits.total)).toBe(10);
      });
    });

    describe('when hits.total is 0', () => {
      it('should return it', () => {
        const hits = { total: 0 } as estypes.SearchHitsMetadata;
        expect(getHitsTotal(hits.total)).toBe(0);
      });
    });
  });
});
