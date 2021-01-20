/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

type GeoPoint =
  | {
      lat: number;
      lon: number;
    }
  | string
  | [number, number];

interface GeoBox {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

/** GeoBoundingBox Accepted Formats:
 *  Lat Lon As Properties:
 *  "top_left" : {
 *    "lat" : 40.73, "lon" : -74.1
 *  },
 *  "bottom_right" : {
 *    "lat" : 40.01,  "lon" : -71.12
 *  }
 *
 *  Lat Lon As Array:
 *  {
 *    "top_left" : [-74.1, 40.73],
 *    "bottom_right" : [-71.12, 40.01]
 *  }
 *
 *  Lat Lon As String:
 *  {
 *    "top_left" : "40.73, -74.1",
 *    "bottom_right" : "40.01, -71.12"
 *  }
 *
 *  Bounding Box as Well-Known Text (WKT):
 *  {
 *    "wkt" : "BBOX (-74.1, -71.12, 40.73, 40.01)"
 *  }
 *
 *  Geohash:
 *  {
 *    "top_right" : "dr5r9ydj2y73",
 *    "bottom_left" : "drj7teegpus6"
 *  }
 *
 *  Vertices:
 *  {
 *    "top" : 40.73,
 *    "left" : -74.1,
 *    "bottom" : 40.01,
 *    "right" : -71.12
 *  }
 *
 * **/
export type GeoBoundingBox =
  | Partial<{
      top_left: GeoPoint;
      top_right: GeoPoint;
      bottom_right: GeoPoint;
      bottom_left: GeoPoint;
    }>
  | {
      wkt: string;
    }
  | GeoBox;
