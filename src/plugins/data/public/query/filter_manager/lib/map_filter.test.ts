/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { mapFilter } from './map_filter';
import { Filter } from '../../../../common';

describe('filter manager utilities', () => {
  function getDisplayName(filter: Filter) {
    return typeof filter.meta.value === 'function'
      ? (filter.meta.value as any)()
      : filter.meta.value;
  }

  describe('mapFilter()', () => {
    test('should map query filters', async () => {
      const before = {
        meta: { index: 'logstash-*' },
        query: { match: { _type: { query: 'apache', type: 'phrase' } } },
      };
      const after = mapFilter(before as Filter);

      expect(after).toHaveProperty('meta');
      expect(after.meta).toHaveProperty('key', '_type');
      expect(after.meta).toHaveProperty('value');
      expect(getDisplayName(after)).toBe('apache');
      expect(after.meta).toHaveProperty('disabled', false);
      expect(after.meta).toHaveProperty('negate', false);
    });

    test('should map exists filters', async () => {
      const before: any = { meta: { index: 'logstash-*' }, exists: { field: '@timestamp' } };
      const after = mapFilter(before as Filter);

      expect(after).toHaveProperty('meta');
      expect(after.meta).toHaveProperty('key', '@timestamp');
      expect(after.meta).toHaveProperty('value');
      expect(getDisplayName(after)).toBe('exists');
      expect(after.meta).toHaveProperty('disabled', false);
      expect(after.meta).toHaveProperty('negate', false);
    });

    test('should map missing filters', async () => {
      const before: any = { meta: { index: 'logstash-*' }, missing: { field: '@timestamp' } };
      const after = mapFilter(before as Filter);

      expect(after).toHaveProperty('meta');
      expect(after.meta).toHaveProperty('key', '@timestamp');
      expect(after.meta).toHaveProperty('value');
      expect(getDisplayName(after)).toBe('missing');
      expect(after.meta).toHaveProperty('disabled', false);
      expect(after.meta).toHaveProperty('negate', false);
    });

    test('should map json filter', async () => {
      const before: any = { meta: { index: 'logstash-*' }, query: { match_all: {} } };
      const after = mapFilter(before as Filter);

      expect(after).toHaveProperty('meta');
      expect(after.meta).toHaveProperty('key', 'query');
      expect(after.meta).toHaveProperty('value');
      expect(getDisplayName(after)).toBe('{"match_all":{}}');
      expect(after.meta).toHaveProperty('disabled', false);
      expect(after.meta).toHaveProperty('negate', false);
    });

    test('should finish with a catch', async (done) => {
      const before: any = { meta: { index: 'logstash-*' } };

      try {
        mapFilter(before as Filter);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
        expect(e.message).toBe('No mappings have been found for filter.');

        done();
      }
    });
  });
});
