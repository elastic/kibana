/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
