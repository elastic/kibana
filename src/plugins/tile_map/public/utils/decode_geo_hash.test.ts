/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { decodeGeoHash } from './decode_geo_hash';

test('decodeGeoHash', () => {
  expect(decodeGeoHash('drm3btev3e86')).toEqual({
    latitude: [41.119999922811985, 41.12000009045005, 41.12000000663102],
    longitude: [-71.34000029414892, -71.3399999588728, -71.34000012651086],
  });
});
