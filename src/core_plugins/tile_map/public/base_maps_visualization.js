import _ from 'lodash';
import { KibanaMap } from './kibana_map';
import 'ui/vis/map/service_settings';


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
      this._baseLayerDirty = true;
      this._mapIsLoaded = new Promise(async (resolve) => {
        await this._makeKibanaMap();
        resolve();
      });
    }

    destroy() {
      if (this._kibanaMap) {
        this._kibanaMap.destroy();
      }
    }

    /**
     * checks whether the data is usable.
     * @return {boolean}
     */
    isDataUsable() {
      return true;
    }

    /**
     * Implementation of Visualization#render.
     * Child-classes can extend this method if the render-complete function requires more time until rendering has completed.
     * @param esResponse
     * @param status
     * @return {Promise}
     */
    async render(esResponse, status) {

      return new Promise(async (resolve) => {

        await this._mapIsLoaded;

        if (status.resize) {
          this._kibanaMap.resize();
        }
        if (status.params || status.aggs) {
          await this._updateParams();
        }

        if (!this.isDataUsable(esResponse)) {
          return resolve();
        }

        if (status.data) {
          await this._updateData(esResponse);
        }
        if (status.uiState) {
          this._kibanaMap.useUiStateFromVisualization(this.vis);
        }

        this._doRenderComplete(resolve);

      });
    }

    /**
     * Creates an instance of a kibana-map with a single baselayer and assigns it to the this._kibanaMap property.
     * Clients can override this method to customize the initialization.
     * @private
     */
    async _makeKibanaMap() {

      if (this._kibanaMap) {
        this._kibanaMap.destroy();
      }
      const options = {};
      const uiState = this.vis.getUiState();
      const zoomFromUiState = parseInt(uiState.get('mapZoom'));
      const centerFromUIState = uiState.get('mapCenter');
      options.zoom = !isNaN(zoomFromUiState) ? zoomFromUiState : this.vis.type.visConfig.defaults.mapZoom;
      options.center = centerFromUIState ? centerFromUIState : this.vis.type.visConfig.defaults.mapCenter;
      this._kibanaMap = new KibanaMap(this._container, options);

      this._kibanaMap.addLegendControl();
      this._kibanaMap.addFitControl();
      this._kibanaMap.persistUiStateForVisualization(this.vis);

      const mapparams = this._getMapsParams();
      await this._updateBaseLayer(mapparams);


    }


    async _updateBaseLayer(mapParams) {

      try {
        this._tmsService = await serviceSettings.getTMSService();
        this._tmsError = null;
      } catch (e) {
        this._tmsService = null;
        this._tmsError = e;
        this._notify.warning(e.message);
      }
      const { minZoom, maxZoom } = this._getMinMaxZoom();

      if (mapParams.wms.enabled) {
        // Switch to WMS
        if (maxZoom > this._kibanaMap.getMaxZoomLevel()) {
          //need to recreate the map with less restrictive zoom
          this._kibanaMap.removeLayer(this._geohashLayer);
          this._geohashLayer = null;
          this._kibanaMap.setMinZoom(minZoom);
          this._kibanaMap.setMaxZoom(maxZoom);
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

        // switch to tms
        if (maxZoom < this._kibanaMap.getMaxZoomLevel()) {
          //need to recreate the map with more restrictive zoom level
          this._kibanaMap.removeLayer(this._geohashLayer);
          this._geohashLayer = null;
          this._kibanaMap.setMinZoom(minZoom);
          this._kibanaMap.setMaxZoom(maxZoom);
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
    }


    _getMinMaxZoom() {
      const mapParams = this._getMapsParams();
      if (this._tmsError) {
        return serviceSettings.getFallbackZoomSettings(mapParams.wms.enabled);
      } else {
        return this._tmsService.getMinMaxZoom(mapParams.wms.enabled);
      }
    }

    async _updateData() {
      throw new Error('Child should implement this method to respond to data-update');
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

    _doRenderCompleteWhenBaseLayerIsLoaded(resolve, endTime) {
      if (this._baseLayerDirty) {
        if (Date.now() <= endTime) {
          setTimeout(() => {
            this._doRenderCompleteWhenBaseLayerIsLoaded(resolve, endTime);
          }, 10);
        } else {
          //wait time exceeded. If the baselayer cannot load, we will still fire a render-complete.
          //This is because slow or unstable network connections cause tiles to get dropped.
          //It is unfortunate that tiles get dropped, but we should not drop the render-complete because of it.
          resolve();
        }
      } else {
        resolve();
      }
    }

    _doRenderComplete(resolve) {
      const msAllowedForBaseLayerToLoad = 10000;
      this._doRenderCompleteWhenBaseLayerIsLoaded(resolve, Date.now() + msAllowedForBaseLayerToLoad);
    }

  };
}

