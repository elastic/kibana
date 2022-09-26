/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PhrasesFilter, Filter } from '@kbn/es-query';
import { FILTERS } from '@kbn/es-query';
import { getPhrasesDisplayValue, mapPhrases } from './map_phrases';
import { FieldFormat } from '@kbn/field-formats-plugin/common';

describe('filter manager utilities', () => {
  describe('mapPhrases()', () => {
    test('should return the key and value for matching filters', async () => {
      const filter = {
        meta: {
          type: FILTERS.PHRASES,
          index: 'logstash-*',
          key: '_type',
          params: ['hello', 1, 'world'],
        },
      } as PhrasesFilter;

      const result = mapPhrases(filter);

      expect(result).toHaveProperty('key', '_type');
      expect(result).toHaveProperty('value', ['hello', 1, 'world']);
    });

    test('should return undefined for none matching', (done) => {
      const filter = {
        meta: { index: 'logstash-*' },
        query: { query_string: { query: 'foo:bar' } },
      } as Filter;

      try {
        mapPhrases(filter);
      } catch (e) {
        expect(e).toBe(filter);
        done();
      }
    });
  });

  describe('getPhrasesDisplayValue()', () => {
    test('without formatter', () => {
      const filter = { meta: { params: ['hello', 1, 'world'] } } as PhrasesFilter;
      const result = getPhrasesDisplayValue(filter);
      expect(result).toMatchInlineSnapshot(`"hello, 1, world"`);
    });

    test('with formatter', () => {
      const filter = { meta: { params: ['hello', 1, 'world'] } } as PhrasesFilter;
      const formatter = { convert: (val) => `formatted ${val}` } as FieldFormat;
      const result = getPhrasesDisplayValue(filter, formatter);
      expect(result).toMatchInlineSnapshot(`"formatted hello, formatted 1, formatted world"`);
    });
  });
});
