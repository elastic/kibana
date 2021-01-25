/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { mapGeoPolygon } from './map_geo_polygon';
import { Filter, GeoPolygonFilter } from '../../../../../common';

describe('filter manager utilities', () => {
  let filter: GeoPolygonFilter;

  beforeEach(() => {
    filter = {
      meta: {
        index: 'logstash-*',
      },
      geo_polygon: {
        point: {
          points: [
            { lat: 5, lon: 10 },
            { lat: 15, lon: 20 },
          ],
        },
      },
    } as GeoPolygonFilter;
  });

  describe('mapGeoPolygon()', () => {
    test('should return the key and value for matching filters with bounds', async () => {
      const result = mapGeoPolygon(filter);

      expect(result).toHaveProperty('key', 'point');
      expect(result).toHaveProperty('value');

      if (result.value) {
        const displayName = result.value();
        // remove html entities and non-alphanumerics to get the gist of the value
        expect(displayName.replace(/&[a-z]+?;/g, '').replace(/[^a-z0-9]/g, '')).toBe(
          'lat5lon10lat15lon20'
        );
      }
    });

    test('should return the key and value even when using ignore_unmapped', async () => {
      const result = mapGeoPolygon(filter);

      expect(result).toHaveProperty('key', 'point');
      expect(result).toHaveProperty('value');

      if (result.value) {
        const displayName = result.value();
        // remove html entities and non-alphanumerics to get the gist of the value
        expect(displayName.replace(/&[a-z]+?;/g, '').replace(/[^a-z0-9]/g, '')).toBe(
          'lat5lon10lat15lon20'
        );
      }
    });

    test('should return undefined for none matching', async (done) => {
      const wrongFilter = {
        meta: { index: 'logstash-*' },
        query: { query_string: { query: 'foo:bar' } },
      } as Filter;

      try {
        mapGeoPolygon(wrongFilter);
      } catch (e) {
        expect(e).toBe(wrongFilter);

        done();
      }
    });
  });
});
