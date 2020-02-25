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

import { geohashColumns } from './decode_geo_hash';

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
