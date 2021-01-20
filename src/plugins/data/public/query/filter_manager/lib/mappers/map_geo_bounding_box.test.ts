/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { mapGeoBoundingBox } from './map_geo_bounding_box';
import { Filter, GeoBoundingBoxFilter } from '../../../../../common';

describe('filter manager utilities', () => {
  describe('mapGeoBoundingBox()', () => {
    test('should return the key and value for matching filters with bounds', async () => {
      const filter = {
        meta: {
          index: 'logstash-*',
        },
        geo_bounding_box: {
          point: {
            // field name
            top_left: { lat: 5, lon: 10 },
            bottom_right: { lat: 15, lon: 20 },
          },
        },
      } as GeoBoundingBoxFilter;

      const result = mapGeoBoundingBox(filter);

      expect(result).toHaveProperty('key', 'point');
      expect(result).toHaveProperty('value');

      if (result.value) {
        const displayName = result.value();
        // remove html entities and non-alphanumerics to get the gist of the value
        expect(displayName.replace(/&[a-z]+?;/g, '').replace(/[^a-z0-9]/g, '')).toBe(
          'lat5lon10tolat15lon20'
        );
      }
    });

    test('should return the key and value even when using ignore_unmapped', async () => {
      const filter = {
        meta: {
          index: 'logstash-*',
        },
        geo_bounding_box: {
          ignore_unmapped: true,
          point: {
            // field name
            top_left: { lat: 5, lon: 10 },
            bottom_right: { lat: 15, lon: 20 },
          },
        },
      } as GeoBoundingBoxFilter;

      const result = mapGeoBoundingBox(filter);

      expect(result).toHaveProperty('key', 'point');
      expect(result).toHaveProperty('value');

      if (result.value) {
        const displayName = result.value();
        // remove html entities and non-alphanumerics to get the gist of the value
        expect(displayName.replace(/&[a-z]+?;/g, '').replace(/[^a-z0-9]/g, '')).toBe(
          'lat5lon10tolat15lon20'
        );
      }
    });

    test('should return undefined for none matching', async (done) => {
      const filter = {
        meta: { index: 'logstash-*' },
        query: { query_string: { query: 'foo:bar' } },
      } as Filter;

      try {
        mapGeoBoundingBox(filter);
      } catch (e) {
        expect(e).toBe(filter);
        done();
      }
    });
  });
});
