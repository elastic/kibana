import 'ui/vislib';
import 'plugins/kbn_vislib_vis_types/controls/vislib_basic_options';
import $ from 'jquery';
import _ from 'lodash';
import { KibanaMap } from './kibana_map';
import { GeohashLayer } from './geohash_layer';
import { SearchSourceProvider } from 'ui/courier/data_source/search_source';
import { VisAggConfigProvider } from 'ui/vis/agg_config';
// import './lib/service_settings';
import 'ui/vis/map/service_settings';
import './styles/_tilemap.less';


export function MapsVisualizationProvider(serviceSettings, Notifier, getAppState, Private) {

  const AggConfig = Private(VisAggConfigProvider);
  const notify = new Notifier({ location: 'Coordinate Map' });
  const SearchSource = Private(SearchSourceProvider);

  class MapsVisualization {

    constructor(element, vis) {
      this.vis = vis;
      this.$el = $(element);
      this._$container = this.$el;
      this._geohashLayer = null;
      this._kibanaMap = null;
      this._baseLayerDirty = true;
      this._currentParams = null;
    }

    destroy() {
      if (this._kibanaMap) {
        this._kibanaMap.destroy();
      }
    }

    init() {
      this._kibanaMapReady = this._makeKibanaMap();
      return this._kibanaMapReady;
    }

    async render(esResponse, status) {

      return new Promise(async(resolve) => {

        await this._kibanaMapReady;
        if (status.resize) {
          this._kibanaMap.resize();
        }
        if (status.params || status.aggs) await this._updateParams();

        if (esResponse && typeof esResponse.geohashGridAgg === 'undefined') {
          return resolve();
        }

        if (status.data) {
          this._recreateGeohashLayer(esResponse);
        }
        if (status.uiState) {
          this._kibanaMap.useUiStateFromVisualization(this.vis);
        }

        this._doRenderComplete(resolve);

      });
    }


    //**********************************************************************************************************
    async _makeKibanaMap() {
      try {
        this._tmsService = await serviceSettings.getTMSService();
        this._tmsError = null;
      } catch (e) {
        this._tmsService = null;
        this._tmsError = e;
        notify.warning(e.message);
      }

      if (this._kibanaMap) {
        this._kibanaMap.destroy();
      }
      const containerElement = $(this._$container)[0];
      const options = _.clone(this._getMinMaxZoom());
      const uiState = this.vis.getUiState();
      const zoomFromUiState = parseInt(uiState.get('mapZoom'));
      const centerFromUIState = uiState.get('mapCenter');
      options.zoom = !isNaN(zoomFromUiState) ? zoomFromUiState : this.vis.type.visConfig.defaults.mapZoom;
      options.center = centerFromUIState ? centerFromUIState : this.vis.type.visConfig.defaults.mapCenter;

      this._kibanaMap = new KibanaMap(containerElement, options);
      this.vis.sessionState.mapBounds = this._kibanaMap.getUntrimmedBounds();

      this._kibanaMap.addDrawControl();
      this._kibanaMap.addFitControl();
      this._kibanaMap.addLegendControl();
      this._kibanaMap.persistUiStateForVisualization(this.vis);

      let previousPrecision = this._kibanaMap.getAutoPrecision();
      let precisionChange = false;
      this._kibanaMap.on('zoomchange', () => {
        precisionChange = (previousPrecision !== this._kibanaMap.getAutoPrecision());
        previousPrecision = this._kibanaMap.getAutoPrecision();
        const agg = this._getGeoHashAgg();
        if (agg) {
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
          this._recreateGeohashLayer(this._chartData);
        }
      });


      this._kibanaMap.on('drawCreated:rectangle', event => {
        this.addSpatialFilter(_.get(this._chartData, 'geohashGridAgg'), 'geo_bounding_box', event.bounds);
      });
      this._kibanaMap.on('drawCreated:polygon', event => {
        this.addSpatialFilter(_.get(this._chartData, 'geohashGridAgg'), 'geo_polygon', { points: event.points });
      });
      this._kibanaMap.on('baseLayer:loaded', () => {
        this._baseLayerDirty = false;
      });
      this._kibanaMap.on('baseLayer:loading', () => {
        this._baseLayerDirty = true;
      });
    }

    _getMinMaxZoom() {
      const mapParams = this._getMapsParams();
      if (this._tmsError) {
        return serviceSettings.getFallbackZoomSettings(mapParams.wms.enabled);
      } else {
        return this._tmsService.getMinMaxZoom(mapParams.wms.enabled);
      }
    }

    _recreateGeohashLayer(esResponse) {

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


    /**
     * called on options change (vis.params change)
     */
    async _updateParams() {
      const mapParams = this._getMapsParams();
      if (_.eq(this._currentParams, mapParams)) {
        return;
      }

      this._currentParams = _.cloneDeep(mapParams);
      const { minZoom, maxZoom } = this._getMinMaxZoom();

      if (mapParams.wms.enabled) {
        //Switch to WMS
        if (maxZoom > this._kibanaMap.getMaxZoomLevel()) {
          //need to recreate the map with less restrictive zoom
          this._geohashLayer = null;
          this._kibanaMapReady = this._makeKibanaMap();
          await this._kibanaMapReady;
        }

        this._kibanaMap.setBaseLayer({
          baseLayerType: 'wms',
          options: {
            minZoom: minZoom,
            maxZoom: maxZoom,
            url: mapParams.wms.url,
            ...mapParams.wms.options
          }
        });
      } else {

        //switch to regular
        if (maxZoom < this._kibanaMap.getMaxZoomLevel()) {
          //need to recreate the map with more restrictive zoom level
          this._geohashLayer = null;
          this._kibanaMapReady = this._makeKibanaMap();
          await this._kibanaMapReady;

          if (this._kibanaMap.getZoomLevel() > maxZoom) {
            this._kibanaMap.setZoomLevel(maxZoom);
          }
        }

        if (!this._tmsError) {
          const url = this._tmsService.getUrl();
          const options = this._tmsService.getTMSOptions();
          this._kibanaMap.setBaseLayer({
            baseLayerType: 'tms',
            options: { url, ...options }
          });
        }
      }
      const geohashOptions = this._getGeohashOptions();
      if (!this._geohashLayer || !this._geohashLayer.isReusable(geohashOptions)) {
        this._recreateGeohashLayer(this._chartData);
      }
      this._kibanaMap.setLegendPosition(mapParams.legendPosition);
      this._kibanaMap.setDesaturateBaseLayer(mapParams.isDesaturated);
      this._kibanaMap.setShowTooltip(mapParams.addTooltip);
      this._kibanaMap.useUiStateFromVisualization(this.vis);

    }

    _getMapsParams() {
      return _.assign(
        {},
        this.vis.type.visConfig.defaults,
        { type: this.vis.type.name },
        this.vis.params
      );
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

    _doRenderComplete(resolve) {
      if (this._baseLayerDirty) {//as long as the baselayer is dirty, we cannot fire the render complete event
        setTimeout(() => {
          this._doRenderComplete(resolve);
        }, 10);
      } else {
        resolve();
      }
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
      getAppState().$newFilters = [filter];
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
            enabled:true,
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

  return MapsVisualization;
}

