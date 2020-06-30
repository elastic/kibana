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
