/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { mapRange } from './map_range';
import { FilterMeta, RangeFilter, Filter } from '../../../../../common';

describe('filter manager utilities', () => {
  describe('mapRange()', () => {
    test('should return the key and value for matching filters with gt/lt', async () => {
      const filter = {
        meta: { index: 'logstash-*' } as FilterMeta,
        range: { bytes: { lt: 2048, gt: 1024 } },
      } as RangeFilter;
      const result = mapRange(filter);

      expect(result).toHaveProperty('key', 'bytes');
      expect(result).toHaveProperty('value');
      if (result.value) {
        const displayName = result.value();
        expect(displayName).toBe('1024 to 2048');
      }
    });

    test('should return undefined for none matching', async (done) => {
      const filter = {
        meta: { index: 'logstash-*' },
        query: { query_string: { query: 'foo:bar' } },
      } as Filter;

      try {
        mapRange(filter);
      } catch (e) {
        expect(e).toBe(filter);

        done();
      }
    });
  });
});
