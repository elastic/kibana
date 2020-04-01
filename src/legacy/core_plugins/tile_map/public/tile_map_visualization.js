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

import { get } from 'lodash';
import { GeohashLayer } from './geohash_layer';
import { BaseMapsVisualizationProvider } from './base_maps_visualization';
import { TileMapTooltipFormatterProvider } from './editors/_tooltip_formatter';
import { npStart } from 'ui/new_platform';
import { getFormat } from '../../../ui/public/visualize/loader/pipeline_helpers/utilities';
import {
  scaleBounds,
  zoomPrecision,
  getPrecision,
  geoContains,
} from '../../../ui/public/vis/map/decode_geo_hash';

export const createTileMapVisualization = ({ serviceSettings, $injector }) => {
  const BaseMapsVisualization = new BaseMapsVisualizationProvider(serviceSettings);
  const tooltipFormatter = new TileMapTooltipFormatterProvider($injector);

  return class CoordinateMapsVisualization extends BaseMapsVisualization {
    constructor(element, vis) {
      super(element, vis);

      this._geohashLayer = null;
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
      if (!geoContains(geohashAgg.aggConfigParams.boundingBox, mapCollar)) {
        updateVarsObject.data.boundingBox = {
          top_left: mapCollar.top_left,
          bottom_right: mapCollar.bottom_right,
        };
      } else {
        updateVarsObject.data.boundingBox = geohashAgg.aggConfigParams.boundingBox;
      }
      // todo: autoPrecision should be vis parameter, not aggConfig one
      updateVarsObject.data.precision = geohashAgg.aggConfigParams.autoPrecision
        ? zoomPrecision[this.vis.getUiState().get('mapZoom')]
        : getPrecision(geohashAgg.aggConfigParams.precision);

      this.vis.eventsSubject.next(updateVarsObject);
    };

    async _makeKibanaMap() {
      await super._makeKibanaMap();

      let previousPrecision = this._kibanaMap.getGeohashPrecision();
      let precisionChange = false;

      const uiState = this.vis.getUiState();
      uiState.on('change', prop => {
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
          typeof geohashAgg.aggConfigParams.autoPrecision === 'boolean'
            ? geohashAgg.aggConfigParams.autoPrecision
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
      this._kibanaMap.on('drawCreated:rectangle', event => {
        const geohashAgg = this._getGeoHashAgg();
        this.addSpatialFilter(geohashAgg, 'geo_bounding_box', event.bounds);
      });
      this._kibanaMap.on('drawCreated:polygon', event => {
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

    _recreateGeohashLayer() {
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
        this._kibanaMap
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
      const metricFormat = getFormat(metricDimension && metricDimension.format);
      const boundTooltipFormatter = tooltipFormatter.bind(
        null,
        metricLabel,
        metricFormat.getConverterFor('text')
      );

      return {
        label: metricLabel,
        valueFormatter: this._geoJsonFeatureCollectionAndMeta
          ? metricFormat.getConverterFor('text')
          : null,
        tooltipFormatter: this._geoJsonFeatureCollectionAndMeta ? boundTooltipFormatter : null,
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
      const field = agg.aggConfigParams.field;
      const filter = { meta: { negate: false, index: indexPatternName } };
      filter[filterName] = { ignore_unmapped: true };
      filter[filterName][field] = filterData;

      const { filterManager } = npStart.plugins.data.query;
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
        return get(agg, 'aggConfigParams.isFilteredByCollar', DEFAULT);
      } else {
        return DEFAULT;
      }
    }
  };
};
