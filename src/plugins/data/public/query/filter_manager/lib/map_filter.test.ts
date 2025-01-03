/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mapFilter } from './map_filter';
import type { Filter, PhraseFilter } from '@kbn/es-query';
import { getDisplayValueFromFilter } from '../../..';

describe('filter manager utilities', () => {
  describe('mapFilter()', () => {
    test('should map query filters', async () => {
      const before = {
        meta: { index: 'logstash-*' },
        query: { match: { _type: { query: 'apache', type: 'phrase' } } },
      };
      const after = mapFilter(before as Filter) as PhraseFilter;

      expect(after).toHaveProperty('meta');
      expect(after.meta).toHaveProperty('key', '_type');
      expect(after.meta).toHaveProperty('value');
      expect(getDisplayValueFromFilter(after, [])).toBe('apache');
      expect(after.meta).toHaveProperty('disabled', false);
      expect(after.meta).toHaveProperty('negate', false);
    });

    test('should map exists filters', async () => {
      const before: any = {
        meta: { index: 'logstash-*' },
        query: { exists: { field: '@timestamp' } },
      };
      const after = mapFilter(before as Filter);

      expect(after).toHaveProperty('meta');
      expect(after.meta).toHaveProperty('key', '@timestamp');
      expect(after.meta).toHaveProperty('value');
      expect(getDisplayValueFromFilter(after, [])).toBe('exists');
      expect(after.meta).toHaveProperty('disabled', false);
      expect(after.meta).toHaveProperty('negate', false);
    });

    test('should map json filter', async () => {
      const before: any = { meta: { index: 'logstash-*' }, query: { test: {} } };
      const after = mapFilter(before as Filter);

      expect(after).toHaveProperty('meta');
      expect(after.meta).toHaveProperty('key', 'query');
      expect(after.meta).toHaveProperty('value');
      expect(getDisplayValueFromFilter(after, [])).toBe('{"test":{}}');
      expect(after.meta).toHaveProperty('disabled', false);
      expect(after.meta).toHaveProperty('negate', false);
    });

    test('should finish with a catch', async () => {
      const before: any = { meta: { index: 'logstash-*' } };

      try {
        mapFilter(before as Filter);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
        expect(e.message).toBe('No mappings have been found for filter.');
      }
    });
  });
});
