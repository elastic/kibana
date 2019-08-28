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
