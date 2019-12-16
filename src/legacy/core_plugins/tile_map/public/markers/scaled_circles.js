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
import $ from 'jquery';
import { EventEmitter } from 'events';
import { truncatedColorMaps } from 'ui/vislib/components/color/truncated_colormaps';
import * as colorUtil from 'ui/vis/map/color_util';

export class ScaledCirclesMarkers extends EventEmitter {
  constructor(
    featureCollection,
    featureCollectionMetaData,
    options,
    targetZoom,
    kibanaMap,
    metricAgg
  ) {
    super();
    this._featureCollection = featureCollection;
    this._featureCollectionMetaData = featureCollectionMetaData;

    this._zoom = targetZoom;
    this._metricAgg = metricAgg;

    this._valueFormatter =
      options.valueFormatter ||
      (x => {
        x;
      });
    this._tooltipFormatter =
      options.tooltipFormatter ||
      (x => {
        x;
      });
    this._label = options.label;
    this._colorRamp = options.colorRamp;

    this._legendColors = null;
    this._legendQuantizer = null;

    this._popups = [];

    const layerOptions = {
      pointToLayer: this.getMarkerFunction(),
      style: this.getStyleFunction(),
      onEachFeature: (feature, layer) => {
        this._bindPopup(feature, layer);
      },
    };
    // Filter leafletlayer on client when results are not filtered on the server
    if (!options.isFilteredByCollar) {
      layerOptions.filter = feature => {
        const bucketRectBounds = feature.properties.geohash_meta.rectangle;
        return kibanaMap.isInside(bucketRectBounds);
      };
    }
    this._leafletLayer = L.geoJson(null, layerOptions);
    this._leafletLayer.addData(this._featureCollection);
  }

  getLeafletLayer() {
    return this._leafletLayer;
  }

  getStyleFunction() {
    const min = _.get(this._featureCollectionMetaData, 'min', 0);
    const max = _.get(this._featureCollectionMetaData, 'max', 1);

    const quantizeDomain = min !== max ? [min, max] : d3.scale.quantize().domain();

    this._legendColors = makeLegendColors(this._colorRamp);
    this._legendQuantizer = d3.scale
      .quantize()
      .domain(quantizeDomain)
      .range(this._legendColors);

    return makeStyleFunction(this._legendColors, quantizeDomain);
  }

  movePointer() {}

  getLabel() {
    if (this._popups.length) {
      return this._label;
    }
    return '';
  }

  appendLegendContents(jqueryDiv) {
    if (!this._legendColors || !this._legendQuantizer) {
      return;
    }

    const titleText = this.getLabel();
    const $title = $('<div>')
      .addClass('visMapLegend__title')
      .text(titleText);
    jqueryDiv.append($title);

    this._legendColors.forEach(color => {
      const labelText = this._legendQuantizer
        .invertExtent(color)
        .map(this._valueFormatter)
        .join(' – ');

      const label = $('<div>');
      const icon = $('<i>').css({
        background: color,
        'border-color': makeColorDarker(color),
      });

      const text = $('<span>').text(labelText);
      label.append(icon);
      label.append(text);

      jqueryDiv.append(label);
    });
  }

  /**
   * Binds popup and events to each feature on map
   *
   * @method bindPopup
   * @param feature {Object}
   * @param layer {Object}
   * return {undefined}
   */
  _bindPopup(feature, layer) {
    const popup = layer.on({
      mouseover: e => {
        const layer = e.target;
        // bring layer to front if not older browser
        if (!L.Browser.ie && !L.Browser.opera) {
          layer.bringToFront();
        }
        this._showTooltip(feature);
      },
      mouseout: () => {
        this.emit('hideTooltip');
      },
    });

    this._popups.push(popup);
  }

  /**
   * Checks if event latlng is within bounds of mapData
   * features and shows tooltip for that feature
   *
   * @method _showTooltip
   * @param feature {LeafletFeature}
   * @return undefined
   */
  _showTooltip(feature) {
    const content = this._tooltipFormatter(feature);
    if (!content) {
      return;
    }

    const latLng = L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]);
    this.emit('showTooltip', {
      content: content,
      position: latLng,
    });
  }

  getMarkerFunction() {
    const scaleFactor = 0.6;
    return (feature, latlng) => {
      const value = feature.properties.value;
      const scaledRadius = this._radiusScale(value) * scaleFactor;
      return L.circleMarker(latlng).setRadius(scaledRadius);
    };
  }

  /**
   * radiusScale returns a number for scaled circle markers
   * for relative sizing of markers
   *
   * @method _radiusScale
   * @param value {Number}
   * @return {Number}
   */
  _radiusScale(value) {
    //magic numbers
    const precisionBiasBase = 5;
    const precisionBiasNumerator = 200;

    const precision = _.max(
      this._featureCollection.features.map(feature => {
        return String(feature.properties.geohash).length;
      })
    );

    const pct = Math.abs(value) / Math.abs(this._featureCollectionMetaData.max);
    const zoomRadius = 0.5 * Math.pow(2, this._zoom);
    const precisionScale = precisionBiasNumerator / Math.pow(precisionBiasBase, precision);

    // square root value percentage
    return Math.pow(pct, 0.5) * zoomRadius * precisionScale;
  }

  getBounds() {
    return this._leafletLayer.getBounds();
  }
}

function makeLegendColors(colorRampKey) {
  const colorRamp = _.get(truncatedColorMaps[colorRampKey], 'value');
  return colorUtil.getLegendColors(colorRamp);
}

function makeColorDarker(color) {
  const amount = 1.3; //magic number, carry over from earlier
  return d3
    .hcl(color)
    .darker(amount)
    .toString();
}

function makeStyleFunction(legendColors, quantizeDomain) {
  const legendQuantizer = d3.scale
    .quantize()
    .domain(quantizeDomain)
    .range(legendColors);
  return feature => {
    const value = _.get(feature, 'properties.value');
    const color = legendQuantizer(value);
    return {
      fillColor: color,
      color: makeColorDarker(color),
      weight: 1.5,
      opacity: 1,
      fillOpacity: 0.75,
    };
  };
}
