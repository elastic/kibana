/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getGeoPrecisionsForZoom } from './geo_precision';

describe('getGeoPrecisionsForZoom', () => {
  test('defaults to MOST_FINE', () => {
    expect(getGeoPrecisionsForZoom(4.5)).toEqual({ geotile: 9, geohex: 4, geohash: 4 });
  });

  test.each([
    ['COARSE', { geotile: 7, geohex: 3, geohash: 3 }],
    ['FINE', { geotile: 8, geohex: 4, geohash: 3 }],
    ['MOST_FINE', { geotile: 9, geohex: 4, geohash: 4 }],
    ['SUPER_FINE', { geotile: 13, geohex: 6, geohash: 5 }],
  ] as const)('%s at zoom 4.5', (resolution, expected) => {
    expect(getGeoPrecisionsForZoom(4.5, resolution)).toEqual(expected);
  });

  test('caps at the maximum precisions', () => {
    expect(getGeoPrecisionsForZoom(30, 'SUPER_FINE')).toEqual({
      geotile: 29,
      geohex: 15,
      geohash: 12,
    });
  });
});
