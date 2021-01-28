/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
  };
}

function refineInterval(interval: number[], cd: number, mask: number) {
  if (cd & mask) { /* eslint-disable-line */
    interval[0] = (interval[0] + interval[1]) / 2;
  } else {
    interval[1] = (interval[0] + interval[1]) / 2;
  }
}

interface GeoBoundingBoxCoordinate {
  lat: number;
  lon: number;
}

interface GeoBoundingBox {
  top_left: GeoBoundingBoxCoordinate;
  bottom_right: GeoBoundingBoxCoordinate;
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
