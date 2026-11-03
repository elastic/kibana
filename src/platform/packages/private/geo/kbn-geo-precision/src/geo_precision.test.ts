/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getGeohashPrecision, getGeohexPrecision, getGeotilePrecision } from './geo_precision';
import { GRID_RESOLUTION } from './grid_resolution';

describe('getGeotilePrecision', () => {
  test.each([
    [GRID_RESOLUTION.COARSE, false, 7],
    [GRID_RESOLUTION.FINE, false, 8],
    [GRID_RESOLUTION.MOST_FINE, false, 9],
    [GRID_RESOLUTION.SUPER_FINE, false, 13],
    [GRID_RESOLUTION.COARSE, true, 7],
    [GRID_RESOLUTION.FINE, true, 10],
    [GRID_RESOLUTION.MOST_FINE, true, 10],
    [GRID_RESOLUTION.SUPER_FINE, true, 13],
  ] as const)('%s, hex %s at zoom 4.5 should be %s', (resolution, hex, expected) => {
    expect(getGeotilePrecision(4.5, resolution, hex)).toBe(expected);
  });

  test('should throw for an unknown resolution', () => {
    expect(() => getGeotilePrecision(4.5, 'UNKNOWN' as unknown as GRID_RESOLUTION)).toThrow(
      'Grid resolution param not recognized: UNKNOWN'
    );
  });
});

describe('getGeohexPrecision', () => {
  test.each([
    [GRID_RESOLUTION.COARSE, 3],
    [GRID_RESOLUTION.FINE, 4],
    [GRID_RESOLUTION.MOST_FINE, 4],
    [GRID_RESOLUTION.SUPER_FINE, 6],
  ] as const)('%s at zoom 4.5 should be H3 resolution %s', (resolution, expected) => {
    expect(getGeohexPrecision(4.5, resolution)).toBe(expected);
  });

  test('should stay within the H3 resolution range', () => {
    expect(getGeohexPrecision(28, GRID_RESOLUTION.SUPER_FINE)).toBe(15);
    expect(getGeohexPrecision(0, GRID_RESOLUTION.COARSE)).toBe(0);
  });
});

describe('getGeohashPrecision', () => {
  test.each([
    [GRID_RESOLUTION.COARSE, 3],
    [GRID_RESOLUTION.FINE, 3],
    [GRID_RESOLUTION.MOST_FINE, 4], // equally close to 3 and 4, finer wins
    [GRID_RESOLUTION.SUPER_FINE, 5],
  ] as const)('%s at zoom 4.5 should be geohash precision %s', (resolution, expected) => {
    expect(getGeohashPrecision(4.5, resolution)).toBe(expected);
  });

  test('should stay within the geohash precision range', () => {
    expect(getGeohashPrecision(0, GRID_RESOLUTION.COARSE)).toBe(1);
    expect(getGeohashPrecision(28, GRID_RESOLUTION.SUPER_FINE)).toBe(12);
  });
});
