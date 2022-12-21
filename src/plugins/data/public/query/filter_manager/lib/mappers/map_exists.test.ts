/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildExistsFilter, buildEmptyFilter, DataViewFieldBase } from '@kbn/es-query';
import { mapExists } from './map_exists';
import { mapQueryString } from './map_query_string';
import type { DataView } from '@kbn/data-views-plugin/common';

describe('filter manager utilities', () => {
  describe('mapExists()', () => {
    let indexPattern: DataView;

    beforeEach(() => {
      indexPattern = {
        id: 'index',
      } as DataView;
    });

    test('should return the key and value for matching filters', async () => {
      const filter = buildExistsFilter({ name: '_type' } as DataViewFieldBase, indexPattern);
      const result = mapExists(filter);

      expect(result).toHaveProperty('key', '_type');
      expect(result).toHaveProperty('value', 'exists');
    });

    test('should return undefined for none matching', async () => {
      const filter = buildEmptyFilter(true);

      try {
        mapQueryString(filter);
      } catch (e) {
        expect(e).toBe(filter);
      }
    });
  });
});
