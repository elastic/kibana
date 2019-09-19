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
import { mapGeoPolygon } from './map_geo_polygon';
import { StubIndexPatterns } from '../test_helpers/stub_index_pattern';
import { IndexPatterns } from '../../../index_patterns';

describe('Filter Bar Directive', () => {
  describe('mapGeoPolygon()', () => {
    let mapGeoPolygonFn: Function;

    beforeEach(() => {
      const indexPatterns: unknown = new StubIndexPatterns();

      mapGeoPolygonFn = mapGeoPolygon(indexPatterns as IndexPatterns);
    });

    test('should return the key and value for matching filters with bounds', async () => {
      const filter = {
        meta: {
          index: 'logstash-*',
        },
        geo_polygon: {
          point: {
            points: [{ lat: 5, lon: 10 }, { lat: 15, lon: 20 }],
          },
        },
      };

      const result = await mapGeoPolygonFn(filter);

      expect(result).toHaveProperty('key', 'point');
      expect(result).toHaveProperty('value');

      // remove html entities and non-alphanumerics to get the gist of the value
      expect(result.value.replace(/&[a-z]+?;/g, '').replace(/[^a-z0-9]/g, '')).toBe(
        'lat5lon10lat15lon20'
      );
    });

    test('should return the key and value even when using ignore_unmapped', async () => {
      const filter = {
        meta: {
          index: 'logstash-*',
        },
        geo_polygon: {
          ignore_unmapped: true,
          point: {
            points: [{ lat: 5, lon: 10 }, { lat: 15, lon: 20 }],
          },
        },
      };
      const result = await mapGeoPolygonFn(filter);

      expect(result).toHaveProperty('key', 'point');
      expect(result).toHaveProperty('value');

      // remove html entities and non-alphanumerics to get the gist of the value
      expect(result.value.replace(/&[a-z]+?;/g, '').replace(/[^a-z0-9]/g, '')).toBe(
        'lat5lon10lat15lon20'
      );
    });

    test('should return undefined for none matching', async done => {
      const filter = {
        meta: { index: 'logstash-*' },
        query: { query_string: { query: 'foo:bar' } },
      };

      try {
        await mapGeoPolygonFn(filter);
      } catch (e) {
        expect(e).toBe(filter);

        done();
      }
    });
  });
});
