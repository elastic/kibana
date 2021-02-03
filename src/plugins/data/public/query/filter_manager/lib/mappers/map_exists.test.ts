/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { mapExists } from './map_exists';
import { mapQueryString } from './map_query_string';
import {
  IIndexPattern,
  IFieldType,
  buildExistsFilter,
  buildEmptyFilter,
} from '../../../../../common';

describe('filter manager utilities', () => {
  describe('mapExists()', () => {
    let indexPattern: IIndexPattern;

    beforeEach(() => {
      indexPattern = {
        id: 'index',
      } as IIndexPattern;
    });

    test('should return the key and value for matching filters', async () => {
      const filter = buildExistsFilter({ name: '_type' } as IFieldType, indexPattern);
      const result = mapExists(filter);

      expect(result).toHaveProperty('key', '_type');
      expect(result).toHaveProperty('value', 'exists');
    });

    test('should return undefined for none matching', async (done) => {
      const filter = buildEmptyFilter(true);

      try {
        mapQueryString(filter);
      } catch (e) {
        expect(e).toBe(filter);
        done();
      }
    });
  });
});
