/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mapSpatialFilter } from './map_spatial_filter';
import { mapFilter } from '../map_filter';
import { FilterMeta, Filter, FILTERS } from '@kbn/es-query';

describe('mapSpatialFilter', () => {
  test('should set meta type field', async () => {
    const filter = {
      meta: {
        type: FILTERS.SPATIAL_FILTER,
      } as FilterMeta,
      query: {},
    } as Filter;
    const result = mapSpatialFilter(filter);

    expect(result).toHaveProperty('type', FILTERS.SPATIAL_FILTER);
    expect(result).toHaveProperty('key', undefined);
    expect(result).toHaveProperty('value', undefined);
  });

  test('should return undefined for none matching', async () => {
    const filter = {
      meta: {
        key: 'location',
        alias: 'my non-spatial filter',
      } as FilterMeta,
      query: {},
    } as Filter;

    try {
      mapSpatialFilter(filter);
    } catch (e) {
      expect(e).toBe(filter);
    }
  });
});

describe('mapFilter', () => {
  test('should set key and value properties to undefined', async () => {
    const before = {
      meta: { type: FILTERS.SPATIAL_FILTER } as FilterMeta,
      query: {},
    } as Filter;
    const after = mapFilter(before);

    expect(after).toHaveProperty('meta');
    expect(after.meta).toHaveProperty('key', undefined);
    expect(after.meta).toHaveProperty('value', undefined);
  });
});
