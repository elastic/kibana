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

import { getGeoPolygonFilterField } from './geo_polygon_filter';

describe('geo_polygon filter', function () {
  describe('getGeoPolygonFilterField', function () {
    it('should return the name of the field a geo_polygon query is targeting', () => {
      const filter = {
        geo_polygon: {
          geoPointField: {
            points: [{ lat: 1, lon: 1 }],
          },
          ignore_unmapped: true,
        },
        meta: {
          disabled: false,
          negate: false,
          alias: null,
          params: {
            points: [{ lat: 1, lon: 1 }],
          },
        },
      };
      const result = getGeoPolygonFilterField(filter);
      expect(result).toBe('geoPointField');
    });
  });
});
