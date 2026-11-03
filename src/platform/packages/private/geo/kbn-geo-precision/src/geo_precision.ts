/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { GRID_RESOLUTION } from './grid_resolution';

export interface GeoPrecisions {
  /** Value for `?_geotile_precision` */
  geotile?: number;
  /** Value for `?_geohex_precision` */
  geohex?: number;
  /** Value for `?_geohash_precision` */
  geohash?: number;
}

export const DEFAULT_GRID_RESOLUTION: GRID_RESOLUTION = GRID_RESOLUTION.MOST_FINE;

const MAX_GEOTILE_LEVEL = 29;

/**
 * Levels added to the map zoom for each resolution.
 * Hexagon resolutions do not scale evenly to zoom levels, so FINE and MOST_FINE
 * share a delta and the steps are wider.
 */
const DELTAS: Record<GRID_RESOLUTION, number> = {
  COARSE: 2,
  FINE: 3,
  MOST_FINE: 4,
  SUPER_FINE: 8,
};
const HEX_DELTAS: Record<GRID_RESOLUTION, number> = {
  COARSE: 2,
  FINE: 5,
  MOST_FINE: 5,
  SUPER_FINE: 8,
};

/**
 * H3 resolution (0-15) for each geotile level (0-29).
 * Same table Elasticsearch uses to turn the vector tile zoom into a geohex_grid precision
 * (`GridAggregation.GEOHEX` in the vector-tile plugin).
 */
// prettier-ignore
const GEOTILE_LEVEL_TO_H3_RESOLUTION = [
  0, 0, 0, 1, 1, 2, 2, 3, 3, 3, 4, 4, 5, 6, 6, 7, 8, 9, 9, 10, 11, 11, 12, 13, 14, 14, 15, 15, 15, 15,
];

/**
 * Geotile level with the same cell width at the equator as a geohash cell, indexed by
 * geohash precision - 1 (precision 1-12).
 */
const GEOHASH_PRECISION_TO_GEOTILE_LEVEL = [3, 5, 8, 10, 13, 15, 18, 20, 23, 25, 28, 30];

export function getGeotileLevelDelta(resolution: GRID_RESOLUTION, hex = false): number {
  const delta = (hex ? HEX_DELTAS : DELTAS)[resolution];
  if (delta === undefined) {
    throw new Error(`Grid resolution param not recognized: ${resolution}`);
  }
  return delta;
}

export function getGeotilePrecision(
  zoom: number,
  resolution: GRID_RESOLUTION = DEFAULT_GRID_RESOLUTION,
  hex = false
): number {
  return Math.min(Math.ceil(zoom) + getGeotileLevelDelta(resolution, hex), MAX_GEOTILE_LEVEL);
}

export function getGeohexPrecision(
  zoom: number,
  resolution: GRID_RESOLUTION = DEFAULT_GRID_RESOLUTION
): number {
  return GEOTILE_LEVEL_TO_H3_RESOLUTION[getGeotilePrecision(zoom, resolution, true)];
}

/**
 * Elasticsearch has no vector tile rule for geohash grids, so the geotile level is converted to
 * the geohash precision whose cell width is closest (finer one when equally close).
 */
export function getGeohashPrecision(
  zoom: number,
  resolution: GRID_RESOLUTION = DEFAULT_GRID_RESOLUTION
): number {
  const level = getGeotilePrecision(zoom, resolution);
  let precision = 1;
  GEOHASH_PRECISION_TO_GEOTILE_LEVEL.forEach((geohashLevel, index) => {
    const best = GEOHASH_PRECISION_TO_GEOTILE_LEVEL[precision - 1];
    if (Math.abs(geohashLevel - level) <= Math.abs(best - level)) {
      precision = index + 1;
    }
  });
  return precision;
}
