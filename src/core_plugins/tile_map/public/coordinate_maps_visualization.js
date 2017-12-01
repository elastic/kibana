import _ from 'lodash';
import { GeohashLayer } from './geohash_layer';
import { BaseMapsVisualizationProvider } from './base_maps_visualization';
import { SearchSourceProvider } from 'ui/courier/data_source/search_source';
import { VisAggConfigProvider } from 'ui/vis/agg_config';
import './styles/_tilemap.less';

export function CoordinateMapsVisualizationProvider(Notifier, Private) {

  const AggConfig = Private(VisAggConfigProvider);
  const SearchSource = Private(SearchSourceProvider);
  const BaseMapsVisualization = Private(BaseMapsVisualizationProvider);

  class CoordinateMapsVisualization extends BaseMapsVisualization {

    constructor(element, vis) {
      super(element, vis);
      this._geohashLayer = null;
      this._notify = new Notifier({ location: 'Coordinate Map' });
    }

    isDataUsable(esResponse) {
      return !(esResponse && typeof esResponse.geohashGridAgg === 'undefined');
    }


    async _makeKibanaMap() {

      await super._makeKibanaMap();

      this.vis.sessionState.mapBounds = this._kibanaMap.getUntrimmedBounds();

      let previousPrecision = this._kibanaMap.getAutoPrecision();
      let precisionChange = false;
      this._kibanaMap.on('zoomchange', () => {
        precisionChange = (previousPrecision !== this._kibanaMap.getAutoPrecision());
        previousPrecision = this._kibanaMap.getAutoPrecision();
        const agg = this._getGeoHashAgg();
        const isAutoPrecision = _.get(this._chartData, 'geohashGridAgg.params.autoPrecision', true);
        if (agg && isAutoPrecision) {
          agg.params.precision = previousPrecision;
        }
      });
      this._kibanaMap.on('zoomend', () => {
        const isAutoPrecision = _.get(this._chartData, 'geohashGridAgg.params.autoPrecision', true);
        if (!isAutoPrecision) {
          return;
        }
        if (precisionChange) {
          this.vis.updateState();
        } else {
          this._updateData(this._chartData);
        }
      });

      this._kibanaMap.addDrawControl();
      this._kibanaMap.on('drawCreated:rectangle', event => {
        this.addSpatialFilter(_.get(this._chartData, 'geohashGridAgg'), 'geo_bounding_box', event.bounds);
      });
      this._kibanaMap.on('drawCreated:polygon', event => {
        this.addSpatialFilter(_.get(this._chartData, 'geohashGridAgg'), 'geo_polygon', { points: event.points });
      });
    }

    async _updateData(esResponse) {
      // Only recreate geohash layer when there is new aggregation data
      // Exception is Heatmap: which needs to be redrawn every zoom level because the clustering is based on meters per pixel
      if (this._getMapsParams().mapType !== 'Heatmap' && esResponse === this._chartData) {
        return;
      }

      this._chartData = esResponse;

      if (this._geohashLayer) {
        this._kibanaMap.removeLayer(this._geohashLayer);
      }
      if (!this._chartData || !this._chartData.geoJson) {
        return;
      }

      const geohashOptions = this._getGeohashOptions();
      this._geohashLayer = new GeohashLayer(this._chartData.geoJson, geohashOptions, this._kibanaMap.getZoomLevel(), this._kibanaMap);
      this._kibanaMap.addLayer(this._geohashLayer);
    }

    async _updateParams() {

      await super._updateParams();

      this._kibanaMap.setDesaturateBaseLayer(this.vis.params.isDesaturated);
      const geohashOptions = this._getGeohashOptions();
      if (!this._geohashLayer || !this._geohashLayer.isReusable(geohashOptions)) {
        this._updateData(this._chartData);
      }

    }


    _getGeohashOptions() {
      const newParams = this._getMapsParams();
      return {
        valueFormatter: this._chartData ? this._chartData.valueFormatter : null,
        tooltipFormatter: this._chartData ? this._chartData.tooltipFormatter : null,
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
      const query = this.vis.API.queryManager.getQuery();
      const language = query.language;

      if (language === 'lucene') {
        const filter = { meta: { negate: false, index: indexPatternName } };
        filter[filterName] = { ignore_unmapped: true };
        filter[filterName][field] = filterData;

        this.vis.API.queryFilter.addFilters([filter]);
      }
      else if (language === 'kuery') {
        const { fromKueryExpression, toKueryExpression, nodeTypes } = this.vis.API.kuery;
        let newQuery;

        if (filterName === 'geo_bounding_box') {
          newQuery = nodeTypes.function.buildNode('geoBoundingBox', field, _.mapKeys(filterData, (value, key) => _.camelCase(key)));
        }
        else if (filterName === 'geo_polygon') {
          newQuery = nodeTypes.function.buildNode('geoPolygon', field, filterData.points);
        }
        else {
          throw new Error(`Kuery does not support ${filterName} queries`);
        }

        const allQueries = _.isEmpty(query.query)
          ? [newQuery]
          : [fromKueryExpression(query.query), newQuery];

        this.vis.API.queryManager.setQuery({
          query: toKueryExpression(nodeTypes.function.buildNode('and', allQueries, 'implicit')),
          language: 'kuery'
        });
      }

      this.vis.updateState();
    }

    async getGeohashBounds() {
      const agg = this._getGeoHashAgg();
      if (agg) {
        const searchSource = new SearchSource();
        searchSource.index(this.vis.indexPattern);
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

