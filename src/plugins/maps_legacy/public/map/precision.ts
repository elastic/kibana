/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

// @ts-ignore
import { getUiSettings } from '../kibana_services';
import { geohashColumns } from './geohash_columns';

/**
 * Get the number of geohash columns (world-wide) for a given precision
 * @param precision the geohash precision
 * @returns {number} the number of columns
 */

const DEFAULT_PRECISION = 2;

function getMaxPrecision() {
  const config = getUiSettings();
  return parseInt(config.get('visualization:tileMap:maxPrecision'), 10) || 12;
}

export function getZoomPrecision() {
  /**
   * Map Leaflet zoom levels to geohash precision levels.
   * The size of a geohash column-width on the map should be at least `minGeohashPixels` pixels wide.
   */
  const zoomPrecision: any = {};
  const minGeohashPixels = 16;
  const maxPrecision = getMaxPrecision();

  for (let zoom = 0; zoom <= 21; zoom += 1) {
    const worldPixels = 256 * Math.pow(2, zoom);
    zoomPrecision[zoom] = 1;
    for (let precision = 2; precision <= maxPrecision; precision += 1) {
      const columns = geohashColumns(precision);
      if (worldPixels / columns >= minGeohashPixels) {
        zoomPrecision[zoom] = precision;
      } else {
        break;
      }
    }
  }
  return zoomPrecision;
}

export function getPrecision(val: string) {
  let precision = parseInt(val, 10);
  const maxPrecision = getMaxPrecision();

  if (Number.isNaN(precision)) {
    precision = DEFAULT_PRECISION;
  }

  if (precision > maxPrecision) {
    return maxPrecision;
  }

  return precision;
}
