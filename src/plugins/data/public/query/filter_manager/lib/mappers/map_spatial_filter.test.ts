/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { mapSpatialFilter } from './map_spatial_filter';
import { FilterMeta, Filter, FILTERS } from '../../../../../common';

describe('mapSpatialFilter()', () => {
  test('should return the key for matching multi polygon filter', async () => {
    const filter = {
      meta: {
        key: 'location',
        alias: 'my spatial filter',
        type: FILTERS.SPATIAL_FILTER,
      } as FilterMeta,
      query: {
        bool: {
          should: [
            {
              geo_polygon: {
                geoCoordinates: { points: [] },
              },
            },
          ],
        },
      },
    } as Filter;
    const result = mapSpatialFilter(filter);

    expect(result).toHaveProperty('key', 'location');
    expect(result).toHaveProperty('value', '');
    expect(result).toHaveProperty('type', FILTERS.SPATIAL_FILTER);
  });

  test('should return the key for matching polygon filter', async () => {
    const filter = {
      meta: {
        key: 'location',
        alias: 'my spatial filter',
        type: FILTERS.SPATIAL_FILTER,
      } as FilterMeta,
      geo_polygon: {
        geoCoordinates: { points: [] },
      },
    } as Filter;
    const result = mapSpatialFilter(filter);

    expect(result).toHaveProperty('key', 'location');
    expect(result).toHaveProperty('value', '');
    expect(result).toHaveProperty('type', FILTERS.SPATIAL_FILTER);
  });

  test('should return undefined for none matching', async (done) => {
    const filter = {
      meta: {
        key: 'location',
        alias: 'my spatial filter',
      } as FilterMeta,
      geo_polygon: {
        geoCoordinates: { points: [] },
      },
    } as Filter;

    try {
      mapSpatialFilter(filter);
    } catch (e) {
      expect(e).toBe(filter);

      done();
    }
  });
});
