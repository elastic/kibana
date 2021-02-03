/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { mapPhrase } from './map_phrase';
import { PhraseFilter, Filter } from '../../../../../common';

describe('filter manager utilities', () => {
  describe('mapPhrase()', () => {
    test('should return the key and value for matching filters', async () => {
      const filter = {
        meta: { index: 'logstash-*' },
        query: { match: { _type: { query: 'apache', type: 'phrase' } } },
      } as PhraseFilter;

      const result = mapPhrase(filter);

      expect(result).toHaveProperty('value');
      expect(result).toHaveProperty('key', '_type');

      if (result.value) {
        const displayName = result.value();
        expect(displayName).toBe('apache');
      }
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
});
