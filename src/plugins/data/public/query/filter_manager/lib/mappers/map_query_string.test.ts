/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { mapQueryString } from './map_query_string';
import { buildQueryFilter, buildEmptyFilter, Filter } from '../../../../../common';

describe('filter manager utilities', () => {
  describe('mapQueryString()', () => {
    test('should return the key and value for matching filters', async () => {
      const filter = buildQueryFilter({ query_string: { query: 'foo:bar' } }, 'index', '');
      const result = mapQueryString(filter as Filter);

      expect(result).toHaveProperty('key', 'query');
      expect(result).toHaveProperty('value', 'foo:bar');
    });

    test('should return undefined for none matching', async (done) => {
      const filter = buildEmptyFilter(true);

      try {
        mapQueryString(filter as Filter);
      } catch (e) {
        expect(e).toBe(filter);
        done();
      }
    });
  });
});
