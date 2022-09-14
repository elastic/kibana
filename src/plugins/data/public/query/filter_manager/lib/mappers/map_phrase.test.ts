/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getPhraseDisplayValue, mapPhrase } from './map_phrase';
import type { PhraseFilter, Filter } from '@kbn/es-query';
import { FieldFormat } from '@kbn/field-formats-plugin/common';

describe('filter manager utilities', () => {
  describe('mapPhrase()', () => {
    test('should return the key for matching filters', async () => {
      const filter = {
        meta: { index: 'logstash-*' },
        query: { match: { _type: { query: 'apache', type: 'phrase' } } },
      } as PhraseFilter;

      const result = mapPhrase(filter);

      expect(result).toHaveProperty('key', '_type');
    });

    test('should return undefined for none matching', async (done) => {
      const filter = {
        meta: { index: 'logstash-*' },
        query: { query_string: { query: 'foo:bar' } },
      } as Filter;

      try {
        mapPhrase(filter);
      } catch (e) {
        expect(e).toBe(filter);
        done();
      }
    });
  });

  describe('getPhraseDisplayValue()', () => {
    test('without formatter with value', () => {
      const filter = { meta: { value: 'hello' } } as PhraseFilter;
      const result = getPhraseDisplayValue(filter);
      expect(result).toMatchInlineSnapshot(`"hello"`);
    });

    test('without formatter empty value', () => {
      const filter = { meta: { value: '' } } as PhraseFilter;
      const result = getPhraseDisplayValue(filter);
      expect(result).toMatchInlineSnapshot(`""`);
    });

    test('without formatter with undefined value', () => {
      const filter = { meta: { params: {} } } as PhraseFilter;
      const result = getPhraseDisplayValue(filter);
      expect(result).toMatchInlineSnapshot(`""`);
    });

    test('with formatter', () => {
      const filter = { meta: { value: 'hello' } } as PhraseFilter;
      const formatter = { convert: (val) => `formatted ${val}` } as FieldFormat;
      const result = getPhraseDisplayValue(filter, formatter);
      expect(result).toMatchInlineSnapshot(`"formatted hello"`);
    });
  });
});
