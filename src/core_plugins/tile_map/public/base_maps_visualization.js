import _ from 'lodash';
import { KibanaMap } from 'ui/vis/map/kibana_map';
import { Observable } from 'rxjs/Rx';
import 'ui/vis/map/service_settings';


const MINZOOM = 0;
const MAXZOOM = 22;//increase this to 22. Better for WMS

export function BaseMapsVisualizationProvider(serviceSettings) {

  /**
   * Abstract base class for a visualization consisting of a map with a single baselayer.
   * @class BaseMapsVisualization
   * @constructor
   */
  return class BaseMapsVisualization {

    constructor(element, vis) {
      this.vis = vis;
      this._container = element;
      this._kibanaMap = null;
      this._chartData = null; //reference to data currently on the map.
      this._baseLayerDirty = true;
      this._mapIsLoaded = this._makeKibanaMap();
    }

    destroy() {
      if (this._kibanaMap) {
        this._kibanaMap.destroy();
        this._kibanaMap = null;
      }
    }

    /**
     * Implementation of Visualization#render.
     * Child-classes can extend this method if the render-complete function requires more time until rendering has completed.
     * @param esResponse
     * @param status
     * @return {Promise}
     */
    async render(esResponse, status) {
      if (!this._kibanaMap) {
        //the visualization has been destroyed;
        return;
      }

      await this._mapIsLoaded;

      if (status.resize) {
        this._kibanaMap.resize();
      }
      if (status.params || status.aggs) {
        await this._updateParams();
      }

      if (this._hasESResponseChanged(esResponse)) {
        await this._updateData(esResponse);
      }
      if (status.uiState) {
        this._kibanaMap.useUiStateFromVisualization(this.vis);
      }

      await this._whenBaseLayerIsLoaded();
    }

    /**
     * Creates an instance of a kibana-map with a single baselayer and assigns it to the this._kibanaMap property.
     * Clients can override this method to customize the initialization.
     * @private
     */
    async _makeKibanaMap() {
      const options = {};
      const uiState = this.vis.getUiState();
      const zoomFromUiState = parseInt(uiState.get('mapZoom'));
      const centerFromUIState = uiState.get('mapCenter');
      options.zoom = !isNaN(zoomFromUiState) ? zoomFromUiState : this.vis.params.mapZoom;
      options.center = centerFromUIState ? centerFromUIState : this.vis.params.mapCenter;

      this._kibanaMap = new KibanaMap(this._container, options);
      this._kibanaMap.setMinZoom(MINZOOM);//use a default
      this._kibanaMap.setMaxZoom(MAXZOOM);//use a default

      this._kibanaMap.addLegendControl();
      this._kibanaMap.addFitControl();
      this._kibanaMap.persistUiStateForVisualization(this.vis);

      this._kibanaMap.on('baseLayer:loaded', () => {
        this._baseLayerDirty = false;
      });
      this._kibanaMap.on('baseLayer:loading', () => {
        this._baseLayerDirty = true;
      });
      await this._updateBaseLayer();
    }


    _baseLayerConfigured() {
      const mapParams = this._getMapsParams();
      return mapParams.wms.baseLayersAreLoaded || mapParams.wms.selectedTmsLayer;
    }

    async _updateBaseLayer() {

      if (!this._kibanaMap) {
        return;
      }

      const mapParams = this._getMapsParams();
      if (!this._baseLayerConfigured()) {
        try {
          const tmsServices = await serviceSettings.getTMSServices();
          const firstRoadMapLayer = tmsServices.find((s) => {
            return s.id === 'road_map';//first road map layer
          });
          const fallback = firstRoadMapLayer ? firstRoadMapLayer : tmsServices[0];
          if (fallback) {
            this._setTmsLayer(firstRoadMapLayer);
          }
        } catch (e) {
          this._notify.warning(e.message);
          return;
        }
        return;
      }

      try {

        if (mapParams.wms.enabled) {

          if (MINZOOM > this._kibanaMap.getMaxZoomLevel()) {
            this._kibanaMap.setMinZoom(MINZOOM);
            this._kibanaMap.setMaxZoom(MAXZOOM);
          }

          this._kibanaMap.setBaseLayer({
            baseLayerType: 'wms',
            options: {
              minZoom: MINZOOM,
              maxZoom: MAXZOOM,
              url: mapParams.wms.url,
              ...mapParams.wms.options
            }
          });
        } else {

          await mapParams.wms.baseLayersAreLoaded;
          const selectedTmsLayer = mapParams.wms.selectedTmsLayer;
          this._setTmsLayer(selectedTmsLayer);

        }
      } catch (tmsLoadingError) {
        this._notify.warning(tmsLoadingError.message);
      }


    }

    async _setTmsLayer(tmsLayer) {
      this._kibanaMap.setMinZoom(tmsLayer.minZoom);
      this._kibanaMap.setMaxZoom(tmsLayer.maxZoom);
      if (this._kibanaMap.getZoomLevel() > tmsLayer.maxZoom) {
        this._kibanaMap.setZoomLevel(tmsLayer.maxZoom);
      }
      const url = tmsLayer.url;
      const options = _.cloneDeep(tmsLayer);
      delete options.id;
      delete options.url;
      this._kibanaMap.setBaseLayer({
        baseLayerType: 'tms',
        options: { url, ...options }
      });
    }

    async _updateData() {
      throw new Error('Child should implement this method to respond to data-update');
    }

    _hasESResponseChanged(data) {
      return this._chartData !== data;
    }

    /**
     * called on options change (vis.params change)
     */
    async _updateParams() {
      const mapParams = this._getMapsParams();
      await this._updateBaseLayer(mapParams);
      this._kibanaMap.setLegendPosition(mapParams.legendPosition);
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

    _whenBaseLayerIsLoaded() {

      if (!this._baseLayerConfigured()) {
        return true;
      }

      const maxTimeForBaseLayer = 10000;
      const interval$ = Observable.interval(10).filter(() => !this._baseLayerDirty);
      const timer$ = Observable.timer(maxTimeForBaseLayer);

      return Observable.race(interval$, timer$).first().toPromise();

    }

  };
}

