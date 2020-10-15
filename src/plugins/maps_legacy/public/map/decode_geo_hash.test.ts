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

import { geohashColumns, decodeGeoHash } from './decode_geo_hash';

test('geohashColumns', () => {
  expect(geohashColumns(1)).toBe(8);
  expect(geohashColumns(2)).toBe(8 * 4);
  expect(geohashColumns(3)).toBe(8 * 4 * 8);
  expect(geohashColumns(4)).toBe(8 * 4 * 8 * 4);
});

test('decodeGeoHash', () => {
  expect(decodeGeoHash('drm3btev3e86')).toEqual({
    latitude: [41.119999922811985, 41.12000009045005, 41.12000000663102],
    longitude: [-71.34000029414892, -71.3399999588728, -71.34000012651086],
  });
});
