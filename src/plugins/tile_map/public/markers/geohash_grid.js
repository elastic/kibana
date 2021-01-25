/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ScaledCirclesMarkers } from './scaled_circles';

export class GeohashGridMarkers extends ScaledCirclesMarkers {
  getMarkerFunction() {
    return (feature) => {
      const geohashRect = feature.properties.geohash_meta.rectangle;
      // get bounds from northEast[3] and southWest[1]
      // corners in geohash rectangle
      const corners = [
        [geohashRect[3][0], geohashRect[3][1]],
        [geohashRect[1][0], geohashRect[1][1]],
      ];
      return this._leaflet.rectangle(corners);
    };
  }
}
