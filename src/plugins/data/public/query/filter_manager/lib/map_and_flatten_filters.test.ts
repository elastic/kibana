/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { mapAndFlattenFilters } from './map_and_flatten_filters';
import { Filter } from '../../../../common';

describe('filter manager utilities', () => {
  describe('mapAndFlattenFilters()', () => {
    let filters: unknown;

    function getDisplayName(filter: Filter) {
      return typeof filter.meta.value === 'function'
        ? (filter.meta.value as any)()
        : filter.meta.value;
    }

    beforeEach(() => {
      filters = [
        null,
        [
          { meta: { index: 'logstash-*' }, exists: { field: '_type' } },
          { meta: { index: 'logstash-*' }, missing: { field: '_type' } },
        ],
        { meta: { index: 'logstash-*' }, query: { query_string: { query: 'foo:bar' } } },
        { meta: { index: 'logstash-*' }, range: { bytes: { lt: 2048, gt: 1024 } } },
        {
          meta: { index: 'logstash-*' },
          query: { match: { _type: { query: 'apache', type: 'phrase' } } },
        },
      ];
    });

    test('should map and flatten the filters', () => {
      const results = mapAndFlattenFilters(filters as Filter[]);

      expect(results).toHaveLength(5);
      expect(results[0]).toHaveProperty('meta');
      expect(results[1]).toHaveProperty('meta');
      expect(results[2]).toHaveProperty('meta');
      expect(results[3]).toHaveProperty('meta');
      expect(results[4]).toHaveProperty('meta');
      expect(results[0].meta).toHaveProperty('key', '_type');
      expect(results[0].meta).toHaveProperty('value', 'exists');
      expect(results[1].meta).toHaveProperty('key', '_type');
      expect(results[1].meta).toHaveProperty('value', 'missing');
      expect(results[2].meta).toHaveProperty('key', 'query');
      expect(results[2].meta).toHaveProperty('value', 'foo:bar');
      expect(results[3].meta).toHaveProperty('key', 'bytes');
      expect(results[3].meta).toHaveProperty('value');
      expect(getDisplayName(results[3])).toBe('1024 to 2048');
      expect(results[4].meta).toHaveProperty('key', '_type');
      expect(results[4].meta).toHaveProperty('value');
      expect(getDisplayName(results[4])).toBe('apache');
    });
  });
});
