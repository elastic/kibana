/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { geohashColumns } from './geohash_columns';

const defaultMaxPrecision = 12;
const minGeoHashPixels = 16;

const calculateZoomToPrecisionMap = (maxZoom: number): Map<number, number> => {
  /**
   * Map Leaflet zoom levels to geohash precision levels.
   * The size of a geohash column-width on the map should be at least `minGeohashPixels` pixels wide.
   */
  const zoomPrecisionMap = new Map();

  for (let zoom = 0; zoom <= maxZoom; zoom += 1) {
    if (typeof zoomPrecisionMap.get(zoom) === 'number') {
      continue;
    }

    const worldPixels = 256 * Math.pow(2, zoom);

    zoomPrecisionMap.set(zoom, 1);

    for (let precision = 2; precision <= defaultMaxPrecision; precision += 1) {
      const columns = geohashColumns(precision);

      if (worldPixels / columns >= minGeoHashPixels) {
        zoomPrecisionMap.set(zoom, precision);
      } else {
        break;
      }
    }
  }

  return zoomPrecisionMap;
};

export function zoomToPrecision(mapZoom: number, maxPrecision: number, maxZoom: number) {
  const zoomPrecisionMap = calculateZoomToPrecisionMap(typeof maxZoom === 'number' ? maxZoom : 21);
  const precision = zoomPrecisionMap.get(mapZoom);

  return precision ? Math.min(precision, maxPrecision) : maxPrecision;
}
