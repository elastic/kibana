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

import L from 'leaflet';
import _ from 'lodash';
import d3 from 'd3';
import { EventEmitter } from 'events';

/**
 * Map overlay: canvas layer with leaflet.heat plugin
 *
 * @param map {Leaflet Object}
 * @param geoJson {geoJson Object}
 * @param params {Object}
 */
export class HeatmapMarkers extends EventEmitter {

  constructor(featureCollection, options, zoom, max) {

    super();
    this._geojsonFeatureCollection = featureCollection;
    const points = dataToHeatArray(featureCollection, max);
    this._leafletLayer = L.heatLayer(points, options);
    this._tooltipFormatter = options.tooltipFormatter;
    this._zoom = zoom;
    this._disableTooltips = false;
    this._getLatLng = _.memoize(function (feature) {
      return L.latLng(
        feature.geometry.coordinates[1],
        feature.geometry.coordinates[0]
      );
    }, function (feature) {
      // turn coords into a string for the memoize cache
      return [feature.geometry.coordinates[1], feature.geometry.coordinates[0]].join(',');
    });
    this._addTooltips();
  }

  getBounds() {
    return this._leafletLayer.getBounds();
  }

  getLeafletLayer() {
    return this._leafletLayer;
  }

  appendLegendContents() {
  }


  movePointer(type, event) {
    if (type === 'mousemove') {
      this._debounceMoveMoveLocation(event);
    } else if (type === 'mouseout') {
      this.emit('hideTooltip');
    } else if (type === 'mousedown') {
      this._disableTooltips = true;
      this.emit('hideTooltip');
    } else if (type === 'mouseup') {
      this._disableTooltips = false;
    }
  }


  _addTooltips() {

    const mouseMoveLocation = (e) => {

      if (!this._geojsonFeatureCollection.features.length || this._disableTooltips) {
        this.emit('hideTooltip');
        return;
      }

      const feature = this._nearestFeature(e.latlng);
      if (this._tooltipProximity(e.latlng, feature)) {
        const content = this._tooltipFormatter(feature);
        if (!content) {
          return;
        }
        this.emit('showTooltip', {
          content: content,
          position: e.latlng
        });
      } else { this.emit('hideTooltip');
      }
    };

    this._debounceMoveMoveLocation = _.debounce(mouseMoveLocation.bind(this), 15, {
      'leading': true,
      'trailing': false
    });
  }

  /**
   * Finds nearest feature in mapData to event latlng
   *
   * @method _nearestFeature
   * @param latLng {Leaflet latLng}
   * @return nearestPoint {Leaflet latLng}
   */
  _nearestFeature(latLng) {
    const self = this;
    let nearest;

    if (latLng.lng < -180 || latLng.lng > 180) {
      return;
    }

    _.reduce(this._geojsonFeatureCollection.features, function (distance, feature) {
      const featureLatLng = self._getLatLng(feature);
      const dist = latLng.distanceTo(featureLatLng);

      if (dist < distance) {
        nearest = feature;
        return dist;
      }

      return distance;
    }, Infinity);

    return nearest;
  }

  /**
   * display tooltip if feature is close enough to event latlng
   *
   * @method _tooltipProximity
   * @param latlng {Leaflet latLng  Object}
   * @param feature {geoJson Object}
   * @return {Boolean}
   */
  _tooltipProximity(latlng, feature) {
    if (!feature) return;

    let showTip = false;
    const featureLatLng = this._getLatLng(feature);

    // zoomScale takes map zoom and returns proximity value for tooltip display
    // domain (input values) is map zoom (min 1 and max 18)
    // range (output values) is distance in meters
    // used to compare proximity of event latlng to feature latlng
    const zoomScale = d3.scale.linear()
      .domain([1, 4, 7, 10, 13, 16, 18])
      .range([1000000, 300000, 100000, 15000, 2000, 150, 50]);

    const proximity = zoomScale(this._zoom);
    const distance = latlng.distanceTo(featureLatLng);

    // maxLngDif is max difference in longitudes
    // to prevent feature tooltip from appearing 360°
    // away from event latlng
    const maxLngDif = 40;
    const lngDif = Math.abs(latlng.lng - featureLatLng.lng);

    if (distance < proximity && lngDif < maxLngDif) {
      showTip = true;
    }

    d3.scale.pow().exponent(0.2)
      .domain([1, 18])
      .range([1500000, 50]);
    return showTip;
  }

}



/**
 * returns normalized data for heat map intensity
 *
 * @method dataToHeatArray
 * @param featureCollection {Array}
 * @return {Array}
 */
function dataToHeatArray(featureCollection, max) {

  return featureCollection.features.map((feature) => {
    const lat = feature.geometry.coordinates[1];
    const lng = feature.geometry.coordinates[0];
    // show bucket value normalized to max value
    const heatIntensity = feature.properties.value / max;

    return [lat, lng, heatIntensity];
  });
}

