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

// @ts-ignore
import { getUiSettings } from '../kibana_services';
import { geohashColumns } from './decode_geo_hash';

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
