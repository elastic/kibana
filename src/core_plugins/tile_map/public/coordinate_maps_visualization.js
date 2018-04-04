import _ from 'lodash';
import { GeohashLayer } from './geohash_layer';
import { BaseMapsVisualizationProvider } from './base_maps_visualization';
import { SearchSourceProvider } from 'ui/courier/data_source/search_source';

import { AggConfig } from 'ui/vis/agg_config';

// import { BasicResponseHandlerProvider } from 'ui/vis/response_handlers/basic';
// import { AggResponseGeoJsonProvider } from 'ui/agg_response/geo_json/geo_json';

import './styles/_tilemap.less';
import { convertToGeoJson } from 'ui/vis/map/convert_to_geojson';

export function CoordinateMapsVisualizationProvider(Notifier, Private) {
  const BaseMapsVisualization = Private(BaseMapsVisualizationProvider);

  class CoordinateMapsVisualization extends BaseMapsVisualization {

    constructor(element, vis) {
      super(element, vis);
      this._geohashLayer = null;
      this._notify = new Notifier({ location: 'Coordinate Map' });
    }


    async _makeKibanaMap() {

      await super._makeKibanaMap();

      this.vis.sessionState.mapBounds = this._kibanaMap.getUntrimmedBounds();

      let previousPrecision = this._kibanaMap.getGeohashPrecision();
      let precisionChange = false;
      this._kibanaMap.on('zoomchange', () => {
        precisionChange = (previousPrecision !== this._kibanaMap.getGeohashPrecision());
        previousPrecision = this._kibanaMap.getGeohashPrecision();
        const agg = this._getGeoHashAgg();
        const isAutoPrecision = typeof agg.params.autoPrecision === 'boolean' ? agg.params.autoPrecision : true;
        if (agg && isAutoPrecision) {
          agg.params.precision = previousPrecision;
        }
      });
      this._kibanaMap.on('zoomend', () => {
        const agg = this._getGeoHashAgg();
        const isAutoPrecision = typeof agg.params.autoPrecision === 'boolean' ? agg.params.autoPrecision : true;
        if (!isAutoPrecision) {
          return;
        }
        if (precisionChange) {
          this.vis.updateState();
        } else {
          this._updateData(this._rawEsResponse);
        }
      });

      this._kibanaMap.addDrawControl();
      this._kibanaMap.on('drawCreated:rectangle', event => {
        const geoAgg = this._getGeoHashAgg();
        this.addSpatialFilter(geoAgg, 'geo_bounding_box', event.bounds);
      });
      this._kibanaMap.on('drawCreated:polygon', event => {
        const geoAgg = this._getGeoHashAgg();
        this.addSpatialFilter(geoAgg, 'geo_polygon', { points: event.points });
      });
    }

    async _updateData(esResponse) {
      // Only recreate geohash layer when there is new aggregation data
      // Exception is Heatmap: which needs to be redrawn every zoom level because the clustering is based on meters per pixel
      if (
        this._getMapsParams().mapType !== 'Heatmap' &&
        esResponse === this._rawEsResponse) {
        return;
      }

      //only now should we apply any transformations to the data.
      if (this._geohashLayer) {
        this._kibanaMap.removeLayer(this._geohashLayer);
        this._geohashLayer = null;
      }

      if (!esResponse) {
        this._geoJson = null;
        this._rawEsResponse = null;
        this._kibanaMap.removeLayer(this._geohashLayer);
        this._geohashLayer = null;
        return;
      }

      this._rawEsResponse = esResponse;
      this._geoJson = convertToGeoJson(esResponse, this.vis.aggs[1]);
      this._recreateGeohashLayer(this._geoJson);
    }

    _recreateGeohashLayer(geoJson) {
      if (this._geohashLayer) {
        this._kibanaMap.removeLayer(this._geohashLayer);
        this._geohashLayer = null;
      }
      const geohashOptions = this._getGeohashOptions();
      this._geohashLayer = new GeohashLayer(geoJson, geohashOptions, this._kibanaMap.getZoomLevel(), this._kibanaMap);
      this._kibanaMap.addLayer(this._geohashLayer);
    }

    async _updateParams() {

      await super._updateParams();

      this._kibanaMap.setDesaturateBaseLayer(this.vis.params.isDesaturated);

      //avoid recreating the leaflet layer when there are option-changes that do not effect the representation
      //e.g. tooltip-visibility, legend position, basemap-desaturation, ...
      const geohashOptions = this._getGeohashOptions();
      if (!this._geohashLayer || !this._geohashLayer.isReusable(geohashOptions)) {
        if (this._geoJson) {
          this._recreateGeohashLayer(this._geoJson);
        }
        this._updateData(this._rawEsResponse);
      }
    }

    _getGeohashOptions() {
      const newParams = this._getMapsParams();
      return {
        // valueFormatter: this._chartData ? this._chartData.valueFormatter : null,
        // tooltipFormatter: this._chartData ? this._chartData.tooltipFormatter : null,
        mapType: newParams.mapType,
        isFilteredByCollar: this._isFilteredByCollar(),
        fetchBounds: this.getGeohashBounds.bind(this),
        heatmap: {
          heatClusterSize: newParams.heatClusterSize
        }
      };
    }

    addSpatialFilter(agg, filterName, filterData) {
      if (!agg) {
        return;
      }

      const indexPatternName = agg.vis.indexPattern.id;
      const field = agg.fieldName();
      const filter = { meta: { negate: false, index: indexPatternName } };
      filter[filterName] = { ignore_unmapped: true };
      filter[filterName][field] = filterData;

      this.vis.API.queryFilter.addFilters([filter]);

      this.vis.updateState();
    }

    async getGeohashBounds() {
      const agg = this._getGeoHashAgg();
      if (agg) {
        const searchSource = this.vis.API.createInheritedSearchSource(this.vis.searchSource);
        searchSource.size(0);
        searchSource.aggs(function () {
          const geoBoundsAgg = new AggConfig(agg.vis, {
            type: 'geo_bounds',
            enabled: true,
            params: {
              field: agg.getField()
            },
            schema: 'metric'
          });
          return {
            '1': geoBoundsAgg.toDsl()
          };
        });
        const esResp = await searchSource.fetch();
        return _.get(esResp, 'aggregations.1.bounds');
      }
    }

    _getGeoHashAgg() {
      return this.vis.getAggConfig().find((agg) => {
        return _.get(agg, 'type.dslName') === 'geohash_grid';
      });
    }

    _isFilteredByCollar() {
      const DEFAULT = false;
      const agg = this._getGeoHashAgg();
      if (agg) {
        return _.get(agg, 'params.isFilteredByCollar', DEFAULT);
      } else {
        return DEFAULT;
      }
    }
  }

  return CoordinateMapsVisualization;
}
