/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';
import { ScaledCirclesMarkers } from './scaled_circles';

export class ShadedCirclesMarkers extends ScaledCirclesMarkers {
  getMarkerFunction() {
    // multiplier to reduce size of all circles
    const scaleFactor = 0.8;
    return (feature, latlng) => {
      const radius = this._geohashMinDistance(feature) * scaleFactor;
      return this._leaflet.circle(latlng, radius);
    };
  }

  /**
   * _geohashMinDistance returns a min distance in meters for sizing
   * circle markers to fit within geohash grid rectangle
   *
   * @method _geohashMinDistance
   * @param feature {Object}
   * @return {Number}
   */
  _geohashMinDistance(feature) {
    const centerPoint = feature.properties.geohash_meta.center;
    const geohashRect = feature.properties.geohash_meta.rectangle;

    // centerPoint is an array of [lat, lng]
    // geohashRect is the 4 corners of the geoHash rectangle
    //   an array that starts at the southwest corner and proceeds
    //   clockwise, each value being an array of [lat, lng]

    // center lat and southeast lng
    const east = this._leaflet.latLng([centerPoint[0], geohashRect[2][1]]);
    // southwest lat and center lng
    const north = this._leaflet.latLng([geohashRect[3][0], centerPoint[1]]);

    // get latLng of geohash center point
    const center = this._leaflet.latLng([centerPoint[0], centerPoint[1]]);

    // get smallest radius at center of geohash grid rectangle
    const eastRadius = Math.floor(center.distanceTo(east));
    const northRadius = Math.floor(center.distanceTo(north));
    return _.min([eastRadius, northRadius]);
  }
}
