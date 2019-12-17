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

import _ from 'lodash';

interface GeoBoundingBoxCoordinate {
  lat: number;
  lon: number;
}

export interface GeoBoundingBox {
  top_left: GeoBoundingBoxCoordinate;
  bottom_right: GeoBoundingBoxCoordinate;
}

export function geoContains(collar: GeoBoundingBox, bounds: GeoBoundingBox) {
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
