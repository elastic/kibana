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

import chrome from 'ui/chrome';
import _ from 'lodash';

const config = chrome.getUiSettingsClient();

interface DecodedGeoHash {
  latitude: number[];
  longitude: number[];
}

/**
 * Decodes geohash to object containing
 * top-left and bottom-right corners of
 * rectangle and center point.
 */
export function decodeGeoHash(geohash: string): DecodedGeoHash {
  const BITS: number[] = [16, 8, 4, 2, 1];
  const BASE32: string = '0123456789bcdefghjkmnpqrstuvwxyz';
  let isEven: boolean = true;
  const lat: number[] = [];
  const lon: number[] = [];
  lat[0] = -90.0;
  lat[1] = 90.0;
  lon[0] = -180.0;
  lon[1] = 180.0;
  let latErr: number = 90.0;
  let lonErr: number = 180.0;
  [...geohash].forEach((nextChar: string) => {
    const cd: number = BASE32.indexOf(nextChar);
    for (let j = 0; j < 5; j++) {
      const mask: number = BITS[j];
      if (isEven) {
        lonErr = lonErr /= 2;
        refineInterval(lon, cd, mask);
      } else {
        latErr = latErr /= 2;
        refineInterval(lat, cd, mask);
      }
      isEven = !isEven;
    }
  });
  lat[2] = (lat[0] + lat[1]) / 2;
  lon[2] = (lon[0] + lon[1]) / 2;
  return {
    latitude: lat,
    longitude: lon,
  } as DecodedGeoHash;
}

function refineInterval(interval: number[], cd: number, mask: number) {
  if (cd & mask) { /* eslint-disable-line */
    interval[0] = (interval[0] + interval[1]) / 2;
  } else {
    interval[1] = (interval[0] + interval[1]) / 2;
  }
}

/**
 * Get the number of geohash cells for a given precision
 *
 * @param {number} precision the geohash precision (1<=precision<=12).
 * @param {number} axis constant for the axis 0=lengthwise (ie. columns, along longitude), 1=heightwise (ie. rows, along latitude).
 * @returns {number} Number of geohash cells (rows or columns) at that precision
 */
function geohashCells(precision: number, axis: number) {
  let cells = 1;
  for (let i = 1; i <= precision; i += 1) {
    /* On odd precisions, rows divide by 4 and columns by 8. Vice-versa on even precisions */
    cells *= i % 2 === axis ? 4 : 8;
  }
  return cells;
}

/**
 * Get the number of geohash columns (world-wide) for a given precision
 * @param precision the geohash precision
 * @returns {number} the number of columns
 */
export function geohashColumns(precision: number): number {
  return geohashCells(precision, 0);
}

const defaultPrecision = 2;
const maxPrecision = parseInt(config.get('visualization:tileMap:maxPrecision'), 10) || 12;
/**
 * Map Leaflet zoom levels to geohash precision levels.
 * The size of a geohash column-width on the map should be at least `minGeohashPixels` pixels wide.
 */
export const zoomPrecision: any = {};
const minGeohashPixels = 16;

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

export function getPrecision(val: string) {
  let precision = parseInt(val, 10);

  if (Number.isNaN(precision)) {
    precision = defaultPrecision;
  }

  if (precision > maxPrecision) {
    return maxPrecision;
  }

  return precision;
}

interface GeoBoundingBoxCoordinate {
  lat: number;
  lon: number;
}

interface GeoBoundingBox {
  top_left: GeoBoundingBoxCoordinate;
  bottom_right: GeoBoundingBoxCoordinate;
}

export function scaleBounds(bounds: GeoBoundingBox): GeoBoundingBox {
  const scale = 0.5; // scale bounds by 50%

  const topLeft = bounds.top_left;
  const bottomRight = bounds.bottom_right;
  let latDiff = _.round(Math.abs(topLeft.lat - bottomRight.lat), 5);
  const lonDiff = _.round(Math.abs(bottomRight.lon - topLeft.lon), 5);
  // map height can be zero when vis is first created
  if (latDiff === 0) latDiff = lonDiff;

  const latDelta = latDiff * scale;
  let topLeftLat = _.round(topLeft.lat, 5) + latDelta;
  if (topLeftLat > 90) topLeftLat = 90;
  let bottomRightLat = _.round(bottomRight.lat, 5) - latDelta;
  if (bottomRightLat < -90) bottomRightLat = -90;
  const lonDelta = lonDiff * scale;
  let topLeftLon = _.round(topLeft.lon, 5) - lonDelta;
  if (topLeftLon < -180) topLeftLon = -180;
  let bottomRightLon = _.round(bottomRight.lon, 5) + lonDelta;
  if (bottomRightLon > 180) bottomRightLon = 180;

  return {
    top_left: { lat: topLeftLat, lon: topLeftLon },
    bottom_right: { lat: bottomRightLat, lon: bottomRightLon },
  };
}

export function geoContains(collar?: GeoBoundingBox, bounds?: GeoBoundingBox) {
  if (!bounds || !collar) return false;
  // test if bounds top_left is outside collar
  if (bounds.top_left.lat > collar.top_left.lat || bounds.top_left.lon < collar.top_left.lon) {
    return false;
  }

  // test if bounds bottom_right is outside collar
  if (
    bounds.bottom_right.lat < collar.bottom_right.lat ||
    bounds.bottom_right.lon > collar.bottom_right.lon
  ) {
    return false;
  }

  // both corners are inside collar so collar contains bounds
  return true;
}
