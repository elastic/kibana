import _ from 'lodash';
import { GeohashLayer } from './geohash_layer';
import { BaseMapsVisualizationProvider } from './base_maps_visualization';
import { AggConfig } from 'ui/vis/agg_config';
import './styles/_tilemap.less';
import { TileMapTooltipFormatterProvider } from './editors/_tooltip_formatter';

export function CoordinateMapsVisualizationProvider(Notifier, Private) {
  const BaseMapsVisualization = Private(BaseMapsVisualizationProvider);

  const tooltipFormatter = Private(TileMapTooltipFormatterProvider);

  class CoordinateMapsVisualization extends BaseMapsVisualization {

    constructor(element, vis) {
      super(element, vis);
      this._geohashLayer = null;
      this._notify = new Notifier({ location: 'Coordinate Map' });
    }


    async _makeKibanaMap() {

      await super._makeKibanaMap();

      this.vis.sessionState.mapBounds = this._kibanaMap.getBounds();

      let previousPrecision = this._kibanaMap.getGeohashPrecision();
      let precisionChange = false;
      this._kibanaMap.on('zoomchange', () => {
        precisionChange = (previousPrecision !== this._kibanaMap.getGeohashPrecision());
        previousPrecision = this._kibanaMap.getGeohashPrecision();
        const geohashAgg = this._getGeoHashAgg();
        if (!geohashAgg) {
          return;
        }
        const isAutoPrecision = typeof geohashAgg.params.autoPrecision === 'boolean' ? geohashAgg.params.autoPrecision : true;
        if (isAutoPrecision) {
          geohashAgg.params.precision = previousPrecision;
        }
      });
      this._kibanaMap.on('zoomend', () => {
        const geohashAgg = this._getGeoHashAgg();
        if (!geohashAgg) {
          return;
        }
        const isAutoPrecision = typeof geohashAgg.params.autoPrecision === 'boolean' ? geohashAgg.params.autoPrecision : true;
        if (!isAutoPrecision) {
          return;
        }
        if (precisionChange) {
          this.vis.updateState();
        } else {
          //when we filter queries by collar
          this._updateData(this._geoJsonFeatureCollectionAndMeta);
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

    async _updateData(geojsonFeatureCollectionAndMeta) {

      // Only recreate geohash layer when there is new aggregation data
      // Exception is Heatmap: which needs to be redrawn every zoom level because the clustering is based on meters per pixel
      if (
        this._getMapsParams().mapType !== 'Heatmap' &&
        geojsonFeatureCollectionAndMeta === this._geoJsonFeatureCollectionAndMeta) {
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
        this._kibanaMap);
      this._kibanaMap.addLayer(this._geohashLayer);
    }

    async _updateParams() {

      await super._updateParams();

      this._kibanaMap.setDesaturateBaseLayer(this.vis.params.isDesaturated);

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
      const metricAgg = this._getMetricAgg();
      const boundTooltipFormatter = tooltipFormatter.bind(null, this.vis.getAggConfig(), metricAgg);

      return {
        label: metricAgg ? metricAgg.makeLabel() : '',
        valueFormatter: this._geoJsonFeatureCollectionAndMeta ? (metricAgg && metricAgg.fieldFormatter()) : null,
        tooltipFormatter: this._geoJsonFeatureCollectionAndMeta ? boundTooltipFormatter : null,
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


    _getMetricAgg() {
      return this.vis.getAggConfig().find((agg) => {
        return agg.type.type === 'metrics';
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
