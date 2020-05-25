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

import { min, isEqual } from 'lodash';
import { i18n } from '@kbn/i18n';
import { L, KibanaMapLayer, MapTypes } from '../../maps_legacy/public';
import { HeatmapMarkers } from './markers/heatmap';
import { ScaledCirclesMarkers } from './markers/scaled_circles';
import { ShadedCirclesMarkers } from './markers/shaded_circles';
import { GeohashGridMarkers } from './markers/geohash_grid';

export class GeohashLayer extends KibanaMapLayer {
  constructor(featureCollection, featureCollectionMetaData, options, zoom, kibanaMap) {
    super();

    this._featureCollection = featureCollection;
    this._featureCollectionMetaData = featureCollectionMetaData;

    this._geohashOptions = options;
    this._zoom = zoom;
    this._kibanaMap = kibanaMap;
    const geojson = L.geoJson(this._featureCollection);
    this._bounds = geojson.getBounds();
    this._createGeohashMarkers();
    this._lastBounds = null;
  }

  _createGeohashMarkers() {
    const markerOptions = {
      isFilteredByCollar: this._geohashOptions.isFilteredByCollar,
      valueFormatter: this._geohashOptions.valueFormatter,
      tooltipFormatter: this._geohashOptions.tooltipFormatter,
      label: this._geohashOptions.label,
      colorRamp: this._geohashOptions.colorRamp,
    };
    switch (this._geohashOptions.mapType) {
      case MapTypes.ScaledCircleMarkers:
        this._geohashMarkers = new ScaledCirclesMarkers(
          this._featureCollection,
          this._featureCollectionMetaData,
          markerOptions,
          this._zoom,
          this._kibanaMap
        );
        break;
      case MapTypes.ShadedCircleMarkers:
        this._geohashMarkers = new ShadedCirclesMarkers(
          this._featureCollection,
          this._featureCollectionMetaData,
          markerOptions,
          this._zoom,
          this._kibanaMap
        );
        break;
      case MapTypes.ShadedGeohashGrid:
        this._geohashMarkers = new GeohashGridMarkers(
          this._featureCollection,
          this._featureCollectionMetaData,
          markerOptions,
          this._zoom,
          this._kibanaMap
        );
        break;
      case MapTypes.Heatmap:
        let radius = 15;
        if (this._featureCollectionMetaData.geohashGridDimensionsAtEquator) {
          const minGridLength = min(this._featureCollectionMetaData.geohashGridDimensionsAtEquator);
          const metersPerPixel = this._kibanaMap.getMetersPerPixel();
          radius = minGridLength / metersPerPixel / 2;
        }
        radius = radius * parseFloat(this._geohashOptions.heatmap.heatClusterSize);
        this._geohashMarkers = new HeatmapMarkers(
          this._featureCollection,
          {
            radius: radius,
            blur: radius,
            maxZoom: this._kibanaMap.getZoomLevel(),
            minOpacity: 0.1,
            tooltipFormatter: this._geohashOptions.tooltipFormatter,
          },
          this._zoom,
          this._featureCollectionMetaData.max
        );
        break;
      default:
        throw new Error(
          i18n.translate('tileMap.geohashLayer.mapTitle', {
            defaultMessage: '{mapType} mapType not recognized',
            values: {
              mapType: this._geohashOptions.mapType,
            },
          })
        );
    }

    this._geohashMarkers.on('showTooltip', (event) => this.emit('showTooltip', event));
    this._geohashMarkers.on('hideTooltip', (event) => this.emit('hideTooltip', event));
    this._leafletLayer = this._geohashMarkers.getLeafletLayer();
  }

  appendLegendContents(jqueryDiv) {
    return this._geohashMarkers.appendLegendContents(jqueryDiv);
  }

  movePointer(...args) {
    this._geohashMarkers.movePointer(...args);
  }

  async getBounds() {
    if (this._geohashOptions.fetchBounds) {
      const geoHashBounds = await this._geohashOptions.fetchBounds();
      if (geoHashBounds) {
        const northEast = L.latLng(geoHashBounds.top_left.lat, geoHashBounds.bottom_right.lon);
        const southWest = L.latLng(geoHashBounds.bottom_right.lat, geoHashBounds.top_left.lon);
        return L.latLngBounds(southWest, northEast);
      }
    }

    return this._bounds;
  }

  updateExtent() {
    // Client-side filtering is only enabled when server-side filter is not used
    if (!this._geohashOptions.isFilteredByCollar) {
      const bounds = this._kibanaMap.getLeafletBounds();
      if (!this._lastBounds || !this._lastBounds.equals(bounds)) {
        //this removal is required to trigger the bounds filter again
        this._kibanaMap.removeLayer(this);
        this._createGeohashMarkers();
        this._kibanaMap.addLayer(this);
      }
      this._lastBounds = bounds;
    }
  }

  isReusable(options) {
    if (isEqual(this._geohashOptions, options)) {
      return true;
    }

    //check if any impacts leaflet styler function
    if (this._geohashOptions.colorRamp !== options.colorRamp) {
      return false;
    } else if (this._geohashOptions.mapType !== options.mapType) {
      return false;
    } else if (
      this._geohashOptions.mapType === 'Heatmap' &&
      !isEqual(this._geohashOptions.heatmap, options)
    ) {
      return false;
    } else {
      return true;
    }
  }
}
