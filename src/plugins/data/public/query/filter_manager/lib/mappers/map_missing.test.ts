/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { mapMissing } from './map_missing';
import { MissingFilter, buildEmptyFilter } from '../../../../../common';

describe('filter manager utilities', () => {
  describe('mapMissing()', () => {
    test('should return the key and value for matching filters', async () => {
      const filter: MissingFilter = {
        missing: { field: '_type' },
        ...buildEmptyFilter(true),
      };
      const result = mapMissing(filter);

      expect(result).toHaveProperty('key', '_type');
      expect(result).toHaveProperty('value', 'missing');
    });

    test('should return undefined for none matching', async (done) => {
      const filter = buildEmptyFilter(true);

      try {
        mapMissing(filter);
      } catch (e) {
        expect(e).toBe(filter);
        done();
      }
    });
  });
});
