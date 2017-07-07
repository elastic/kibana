import $ from 'jquery';
import _ from 'lodash';
import { FilterBarPushFilterProvider } from 'ui/filter_bar/push_filter';
import { KibanaMap } from './kibana_map';
import { GeohashLayer } from './geohash_layer';
import './lib/tilemap_settings';
import './styles/_tilemap.less';


module.exports = function MapsRenderbotFactory(Private, $injector, tilemapSettings, Notifier, courier, getAppState) {

  const notify = new Notifier({ location: 'Tilemap' });

  class MapsRenderbot {

    constructor(vis, $el, uiState) {
      this.vis = vis;
      this.$el = $el;
      this.uiState = uiState;
      this._geohashLayer = null;
      this._kibanaMap = null;
      this._$container = $el;
      this._kibanaMapReady = this._makeKibanaMap($el);

      this._baseLayerDirty = true;
      this._dataDirty = true;
      this._paramsDirty = true;
    }

    resize() {
      if (this._kibanaMap) {
        this._kibanaMap.resize();
      }
    }

    async _makeKibanaMap() {

      if (!tilemapSettings.isInitialized()) {
        await tilemapSettings.loadSettings();
      }

      if (tilemapSettings.getError()) {
        //Still allow the visualization to be built, but show a toast that there was a problem retrieving map settings
        //Even though the basemap will not display, the user will at least still see the overlay data
        notify.warning(tilemapSettings.getError().message);
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
      this._kibanaMap.addDrawControl();
      this._kibanaMap.addFitControl();
      this._kibanaMap.addLegendControl();
      this._kibanaMap.persistUiStateForVisualization(this.vis);

      let previousPrecision = this._kibanaMap.getAutoPrecision();
      let precisionChange = false;
      this._kibanaMap.on('zoomchange', () => {
        precisionChange = (previousPrecision !== this._kibanaMap.getAutoPrecision());
        previousPrecision = this._kibanaMap.getAutoPrecision();
      });
      this._kibanaMap.on('zoomend', () => {

        const isAutoPrecision = _.get(this._chartData, 'geohashGridAgg.params.autoPrecision', true);
        if (!isAutoPrecision) {
          return;
        }

        this._dataDirty = true;
        if (precisionChange) {
          courier.fetch();
        } else {
          this._recreateGeohashLayer();
          this._dataDirty = false;
          this._doRenderComplete();
        }
      });


      this._kibanaMap.on('drawCreated:rectangle', event => {
        addSpatialFilter(_.get(this._chartData, 'geohashGridAgg'), 'geo_bounding_box', event.bounds);
      });
      this._kibanaMap.on('drawCreated:polygon', event => {
        addSpatialFilter(_.get(this._chartData, 'geohashGridAgg'), 'geo_polygon', { points: event.points });
      });
      this._kibanaMap.on('baseLayer:loaded', () => {
        this._baseLayerDirty = false;
        this._doRenderComplete();
      });
      this._kibanaMap.on('baseLayer:loading', () => {
        this._baseLayerDirty = true;
      });
    }

    _getMinMaxZoom() {
      const mapParams = this._getMapsParams();
      return tilemapSettings.getMinMaxZoom(mapParams.wms.enabled);
    }

    _recreateGeohashLayer() {
      if (this._geohashLayer) {
        this._kibanaMap.removeLayer(this._geohashLayer);
      }
      if (!this._geohashGeoJson) {
        return;
      }
      const geohashOptions = this._getGeohashOptions();
      this._geohashLayer = new GeohashLayer(this._chartData.geoJson, geohashOptions, this._kibanaMap.getZoomLevel(), this._kibanaMap);
      this._kibanaMap.addLayer(this._geohashLayer);
    }


    /**
     * called on data change
     * @param esResponse
     */
    async render(esResponse) {
      this._dataDirty = true;
      this._kibanaMapReady.then(() => {
        this._chartData = esResponse;
        this._geohashGeoJson = this._chartData.geoJson;
        this._recreateGeohashLayer();
        this._kibanaMap.useUiStateFromVisualization(this.vis);
        this._kibanaMap.resize();
        this._dataDirty = false;
        this._doRenderComplete();
      });
    }

    destroy() {
      if (this._kibanaMap) {
        this._kibanaMap.destroy();
      }
    }

    /**
     * called on options change (vis.params change)
     */
    updateParams() {

      this._paramsDirty = true;
      this._kibanaMapReady.then(async() => {
        const mapParams = this._getMapsParams();
        const { minZoom, maxZoom } = this._getMinMaxZoom();

        if (mapParams.wms.enabled) {

          if (maxZoom > this._kibanaMap.getMaxZoomLevel()) {
            this._geohashLayer = null;
            this._kibanaMapReady = this._makeKibanaMap();
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

          if (maxZoom < this._kibanaMap.getMaxZoomLevel()) {
            this._geohashLayer = null;
            this._kibanaMapReady = this._makeKibanaMap();
            this._kibanaMap.setZoomLevel(maxZoom);
          }

          if (!tilemapSettings.hasError()) {
            const url = tilemapSettings.getUrl();
            const options = tilemapSettings.getTMSOptions();
            this._kibanaMap.setBaseLayer({
              baseLayerType: 'tms',
              options: { url, ...options }
            });
          }
        }
        const geohashOptions = this._getGeohashOptions();
        if (!this._geohashLayer || !this._geohashLayer.isReusable(geohashOptions)) {
          this._recreateGeohashLayer();
        }

        this._kibanaMap.setDesaturateBaseLayer(mapParams.isDesaturated);
        this._kibanaMap.setShowTooltip(mapParams.addTooltip);
        this._kibanaMap.setLegendPosition(mapParams.legendPosition);

        this._kibanaMap.useUiStateFromVisualization(this.vis);
        this._kibanaMap.resize();
        this._paramsDirty = false;
        this._doRenderComplete();
      });
    }

    _getMapsParams() {
      return _.assign(
        {},
        this.vis.type.visConfig.defaults,
        {
          type: this.vis.type.name,
          hasTimeField: this.vis.indexPattern && this.vis.indexPattern.hasTimeField()// Add attribute which determines whether an index is time based or not.
        },
        this.vis.params
      );
    }

    _getGeohashOptions() {
      const newParams = this._getMapsParams();
      return {
        valueFormatter: this._chartData ? this._chartData.valueFormatter : null,
        tooltipFormatter: this._chartData ? this._chartData.tooltipFormatter : null,
        mapType: newParams.mapType,
        heatmap: {
          heatBlur: newParams.heatBlur,
          heatMaxZoom: newParams.heatMaxZoom,
          heatMinOpacity: newParams.heatMinOpacity,
          heatRadius: newParams.heatRadius
        }
      };
    }

    _doRenderComplete() {
      if (this._paramsDirty || this._dataDirty || this._baseLayerDirty) {
        return false;
      }
      this.$el.trigger('renderComplete');
      return true;
    }

  }

  function addSpatialFilter(agg, filterName, filterData) {
    if (!agg) {
      return;
    }

    const indexPatternName = agg.vis.indexPattern.id;
    const field = agg.fieldName();
    const filter = {};
    filter[filterName] = { ignore_unmapped: true };
    filter[filterName][field] = filterData;

    const putFilter = Private(FilterBarPushFilterProvider)(getAppState());
    return putFilter(filter, false, indexPatternName);
  }


  return MapsRenderbot;
};
