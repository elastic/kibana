/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { mapGeoBoundingBox } from './map_geo_bounding_box';
import { esFilters } from '../../../../../common';

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
      } as esFilters.GeoBoundingBoxFilter;

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
      } as esFilters.GeoBoundingBoxFilter;

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

    test('should return undefined for none matching', async done => {
      const filter = {
        meta: { index: 'logstash-*' },
        query: { query_string: { query: 'foo:bar' } },
      } as esFilters.Filter;

      try {
        mapGeoBoundingBox(filter);
      } catch (e) {
        expect(e).toBe(filter);
        done();
      }
    });
  });
});
