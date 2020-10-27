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

import { get, round } from 'lodash';
import { getFormatService, getQueryService, getKibanaLegacy } from './services';
import {
  geoContains,
  mapTooltipProvider,
  lazyLoadMapsLegacyModules,
} from '../../maps_legacy/public';
import { tooltipFormatter } from './tooltip_formatter';

function scaleBounds(bounds) {
  const scale = 0.5; // scale bounds by 50%

  const topLeft = bounds.top_left;
  const bottomRight = bounds.bottom_right;
  let latDiff = round(Math.abs(topLeft.lat - bottomRight.lat), 5);
  const lonDiff = round(Math.abs(bottomRight.lon - topLeft.lon), 5);
  // map height can be zero when vis is first created
  if (latDiff === 0) latDiff = lonDiff;

  const latDelta = latDiff * scale;
  let topLeftLat = round(topLeft.lat, 5) + latDelta;
  if (topLeftLat > 90) topLeftLat = 90;
  let bottomRightLat = round(bottomRight.lat, 5) - latDelta;
  if (bottomRightLat < -90) bottomRightLat = -90;
  const lonDelta = lonDiff * scale;
  let topLeftLon = round(topLeft.lon, 5) - lonDelta;
  if (topLeftLon < -180) topLeftLon = -180;
  let bottomRightLon = round(bottomRight.lon, 5) + lonDelta;
  if (bottomRightLon > 180) bottomRightLon = 180;

  return {
    top_left: { lat: topLeftLat, lon: topLeftLon },
    bottom_right: { lat: bottomRightLat, lon: bottomRightLon },
  };
}

export const createTileMapVisualization = (dependencies) => {
  const { getZoomPrecision, getPrecision, BaseMapsVisualization } = dependencies;

  return class CoordinateMapsVisualization extends BaseMapsVisualization {
    constructor(element, vis) {
      super(element, vis);

      this._geohashLayer = null;
      this._tooltipFormatter = mapTooltipProvider(element, tooltipFormatter);
    }

    updateGeohashAgg = () => {
      const geohashAgg = this._getGeoHashAgg();
      if (!geohashAgg) return;
      const updateVarsObject = {
        name: 'bounds',
        data: {},
      };
      const bounds = this._kibanaMap.getBounds();
      const mapCollar = scaleBounds(bounds);
      if (!geoContains(geohashAgg.sourceParams.params.boundingBox, mapCollar)) {
        updateVarsObject.data.boundingBox = {
          top_left: mapCollar.top_left,
          bottom_right: mapCollar.bottom_right,
        };
      } else {
        updateVarsObject.data.boundingBox = geohashAgg.sourceParams.params.boundingBox;
      }
      // todo: autoPrecision should be vis parameter, not aggConfig one
      const zoomPrecision = getZoomPrecision();
      updateVarsObject.data.precision = geohashAgg.sourceParams.params.autoPrecision
        ? zoomPrecision[this.vis.getUiState().get('mapZoom')]
        : getPrecision(geohashAgg.sourceParams.params.precision);

      this.vis.eventsSubject.next(updateVarsObject);
    };

    async render(esResponse, visParams) {
      getKibanaLegacy().loadFontAwesome();
      await super.render(esResponse, visParams);
    }

    async _makeKibanaMap() {
      await super._makeKibanaMap();

      let previousPrecision = this._kibanaMap.getGeohashPrecision();
      let precisionChange = false;

      const uiState = this.vis.getUiState();
      uiState.on('change', (prop) => {
        if (prop === 'mapZoom' || prop === 'mapCenter') {
          this.updateGeohashAgg();
        }
      });

      this._kibanaMap.on('zoomchange', () => {
        precisionChange = previousPrecision !== this._kibanaMap.getGeohashPrecision();
        previousPrecision = this._kibanaMap.getGeohashPrecision();
      });
      this._kibanaMap.on('zoomend', () => {
        const geohashAgg = this._getGeoHashAgg();
        if (!geohashAgg) {
          return;
        }
        const isAutoPrecision =
          typeof geohashAgg.sourceParams.params.autoPrecision === 'boolean'
            ? geohashAgg.sourceParams.params.autoPrecision
            : true;
        if (!isAutoPrecision) {
          return;
        }
        if (precisionChange) {
          this.updateGeohashAgg();
        } else {
          //when we filter queries by collar
          this._updateData(this._geoJsonFeatureCollectionAndMeta);
        }
      });

      this._kibanaMap.addDrawControl();
      this._kibanaMap.on('drawCreated:rectangle', (event) => {
        const geohashAgg = this._getGeoHashAgg();
        this.addSpatialFilter(geohashAgg, 'geo_bounding_box', event.bounds);
      });
      this._kibanaMap.on('drawCreated:polygon', (event) => {
        const geohashAgg = this._getGeoHashAgg();
        this.addSpatialFilter(geohashAgg, 'geo_polygon', { points: event.points });
      });
    }

    async _updateData(geojsonFeatureCollectionAndMeta) {
      // Only recreate geohash layer when there is new aggregation data
      // Exception is Heatmap: which needs to be redrawn every zoom level because the clustering is based on meters per pixel
      if (
        this._getMapsParams().mapType !== 'Heatmap' &&
        geojsonFeatureCollectionAndMeta === this._geoJsonFeatureCollectionAndMeta
      ) {
        return;
      }

      if (this._geohashLayer) {
        this._kibanaMap.removeLayer(this._geohashLayer);
        this._geohashLayer = null;
      }

      if (!geojsonFeatureCollectionAndMeta) {
        this._geoJsonFeatureCollectionAndMeta = null;
        this._kibanaMap.removeLayer(this._geohashLayer);
        this._geohashLayer = null;
        return;
      }

      if (
        !this._geoJsonFeatureCollectionAndMeta ||
        !geojsonFeatureCollectionAndMeta.featureCollection.features.length
      ) {
        this._geoJsonFeatureCollectionAndMeta = geojsonFeatureCollectionAndMeta;
        this.updateGeohashAgg();
      }

      this._geoJsonFeatureCollectionAndMeta = geojsonFeatureCollectionAndMeta;
      this._recreateGeohashLayer();
    }

    async _recreateGeohashLayer() {
      const { GeohashLayer } = await import('./geohash_layer');

      if (this._geohashLayer) {
        this._kibanaMap.removeLayer(this._geohashLayer);
        this._geohashLayer = null;
      }
      const geohashOptions = this._getGeohashOptions();
      this._geohashLayer = new GeohashLayer(
        this._geoJsonFeatureCollectionAndMeta.featureCollection,
        this._geoJsonFeatureCollectionAndMeta.meta,
        geohashOptions,
        this._kibanaMap.getZoomLevel(),
        this._kibanaMap,
        (await lazyLoadMapsLegacyModules()).L
      );
      this._kibanaMap.addLayer(this._geohashLayer);
    }

    async _updateParams() {
      await super._updateParams();

      this._kibanaMap.setDesaturateBaseLayer(this._params.isDesaturated);

      //avoid recreating the leaflet layer when there are option-changes that do not effect the representation
      //e.g. tooltip-visibility, legend position, basemap-desaturation, ...
      const geohashOptions = this._getGeohashOptions();
      if (!this._geohashLayer || !this._geohashLayer.isReusable(geohashOptions)) {
        if (this._geoJsonFeatureCollectionAndMeta) {
          this._recreateGeohashLayer();
        }
        this._updateData(this._geoJsonFeatureCollectionAndMeta);
      }
    }

    _getGeohashOptions() {
      const newParams = this._getMapsParams();
      const metricDimension = this._params.dimensions.metric;
      const metricLabel = metricDimension ? metricDimension.label : '';
      const metricFormat = getFormatService().deserialize(
        metricDimension && metricDimension.format
      );

      return {
        label: metricLabel,
        valueFormatter: this._geoJsonFeatureCollectionAndMeta
          ? metricFormat.getConverterFor('text')
          : null,
        tooltipFormatter: this._geoJsonFeatureCollectionAndMeta
          ? this._tooltipFormatter.bind(null, metricLabel, metricFormat.getConverterFor('text'))
          : null,
        mapType: newParams.mapType,
        isFilteredByCollar: this._isFilteredByCollar(),
        colorRamp: newParams.colorSchema,
        heatmap: {
          heatClusterSize: newParams.heatClusterSize,
        },
      };
    }

    addSpatialFilter(agg, filterName, filterData) {
      if (!agg) {
        return;
      }

      const indexPatternName = agg.indexPatternId;
      const field = agg.field;
      const filter = { meta: { negate: false, index: indexPatternName } };
      filter[filterName] = { ignore_unmapped: true };
      filter[filterName][field] = filterData;

      const { filterManager } = getQueryService();
      filterManager.addFilters([filter]);

      this.vis.updateState();
    }

    _getGeoHashAgg() {
      return (
        this._geoJsonFeatureCollectionAndMeta && this._geoJsonFeatureCollectionAndMeta.meta.geohash
      );
    }

    _isFilteredByCollar() {
      const DEFAULT = false;
      const agg = this._getGeoHashAgg();
      if (agg) {
        return get(agg, 'sourceParams.params.isFilteredByCollar', DEFAULT);
      } else {
        return DEFAULT;
      }
    }
  };
};
