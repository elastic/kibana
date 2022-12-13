/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getRangeDisplayValue, mapRange } from './map_range';
import { FilterMeta, RangeFilter, Filter } from '@kbn/es-query';

describe('filter manager utilities', () => {
  describe('mapRange()', () => {
    test('should return the key and value for matching filters with gt/lt', async () => {
      const filter = {
        meta: { index: 'logstash-*' } as FilterMeta,
        query: { range: { bytes: { lt: 2048, gt: 1024 } } },
      } as RangeFilter;
      const result = mapRange(filter);

      expect(result).toHaveProperty('key', 'bytes');
      expect(result).toHaveProperty('value', { gt: 1024, lt: 2048 });
    });

    test('should return undefined for none matching', async () => {
      const filter = {
        meta: { index: 'logstash-*' },
        query: { query_string: { query: 'foo:bar' } },
      } as Filter;

      try {
        mapRange(filter);
      } catch (e) {
        expect(e).toBe(filter);
      }
    });
  });

  describe('getRangeDisplayValue()', () => {
    test('gt & lt', () => {
      const params = { gt: 10, lt: 100 };
      const filter = { meta: { params } } as RangeFilter;
      const result = getRangeDisplayValue(filter);
      expect(result).toMatchInlineSnapshot(`"10 to 100"`);
    });

    test('gt & lte', () => {
      const params = { gt: 20, lte: 200 };
      const filter = { meta: { params } } as RangeFilter;
      const result = getRangeDisplayValue(filter);
      expect(result).toMatchInlineSnapshot(`"20 to 200"`);
    });

    test('gte & lt', () => {
      const params = { gte: 'low', lt: 'high' };
      const filter = { meta: { params } } as RangeFilter;
      const result = getRangeDisplayValue(filter);
      expect(result).toMatchInlineSnapshot(`"low to high"`);
    });

    test('gte & lte', () => {
      const params = { gte: 40, lte: 400 };
      const filter = { meta: { params } } as RangeFilter;
      const result = getRangeDisplayValue(filter);
      expect(result).toMatchInlineSnapshot(`"40 to 400"`);
    });

    test('gt', () => {
      const params = { gt: 50 };
      const filter = { meta: { params } } as RangeFilter;
      const result = getRangeDisplayValue(filter);
      expect(result).toMatchInlineSnapshot(`"50 to Infinity"`);
    });

    test('gte', () => {
      const params = { gte: 60 };
      const filter = { meta: { params } } as RangeFilter;
      const result = getRangeDisplayValue(filter);
      expect(result).toMatchInlineSnapshot(`"60 to Infinity"`);
    });

    test('lt', () => {
      const params = { lt: 70 };
      const filter = { meta: { params } } as RangeFilter;
      const result = getRangeDisplayValue(filter);
      expect(result).toMatchInlineSnapshot(`"-Infinity to 70"`);
    });

    test('lte', () => {
      const params = { lte: 80 };
      const filter = { meta: { params } } as RangeFilter;
      const result = getRangeDisplayValue(filter);
      expect(result).toMatchInlineSnapshot(`"-Infinity to 80"`);
    });
  });
});
