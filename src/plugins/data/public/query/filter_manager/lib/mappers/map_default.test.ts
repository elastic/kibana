/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { mapDefault } from './map_default';
import { buildQueryFilter, buildEmptyFilter } from '../../../../../common';

describe('filter manager utilities', () => {
  describe('mapDefault()', () => {
    test('should return the key and value for matching filters', async () => {
      const filter = buildQueryFilter({ match_all: {} }, 'index', '');
      const result = mapDefault(filter);

      expect(result).toHaveProperty('key', 'query');
      expect(result).toHaveProperty('value', '{"match_all":{}}');
    });

    test('should return undefined if there is no valid key', async () => {
      const filter = buildEmptyFilter(true);

      try {
        mapDefault(filter);
      } catch (e) {
        expect(e).toBe(filter);
      }
    });
  });
});
