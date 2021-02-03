/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import * as Rx from 'rxjs';
import { filter, first } from 'rxjs/operators';
import { getEmsTileLayerId, getUiSettings, getToasts } from '../kibana_services';
import { lazyLoadMapsLegacyModules } from '../lazy_load_bundle';
import { getServiceSettings } from '../get_service_settings';

const WMS_MINZOOM = 0;
const WMS_MAXZOOM = 22; //increase this to 22. Better for WMS

export function BaseMapsVisualizationProvider() {
  /**
   * Abstract base class for a visualization consisting of a map with a single baselayer.
   * @class BaseMapsVisualization
   * @constructor
   */
  return class BaseMapsVisualization {
    constructor(element, handlers, initialVisParams) {
      this.handlers = handlers;
      this._params = initialVisParams;
      this._container = element;
      this._kibanaMap = null;
      this._chartData = null; //reference to data currently on the map.
      this._baseLayerDirty = true;
      this._mapIsLoaded = this._makeKibanaMap();
    }

    isLoaded() {
      return this._mapIsLoaded;
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
    async render(esResponse = this._esResponse, visParams = this._params) {
      await this._mapIsLoaded;

      if (!this._kibanaMap) {
        //the visualization has been destroyed;
        return;
      }

      this.resize();
      this._params = visParams;
      await this._updateParams();

      if (this._hasESResponseChanged(esResponse)) {
        this._esResponse = esResponse;
        await this._updateData(esResponse);
      }
      this._kibanaMap.useUiStateFromVisualization(this.handlers.uiState);

      await this._whenBaseLayerIsLoaded();
    }

    resize() {
      this._kibanaMap?.resize();
    }

    /**
     * Creates an instance of a kibana-map with a single baselayer and assigns it to the this._kibanaMap property.
     * Clients can override this method to customize the initialization.
     * @private
     */
    async _makeKibanaMap() {
      const options = {};
      const zoomFromUiState = parseInt(this.handlers.uiState?.get('mapZoom'));
      const centerFromUIState = this.handlers.uiState?.get('mapCenter');
      const { mapZoom, mapCenter } = this._getMapsParams();
      options.zoom = !isNaN(zoomFromUiState) ? zoomFromUiState : mapZoom;
      options.center = centerFromUIState ? centerFromUIState : mapCenter;

      const modules = await lazyLoadMapsLegacyModules();
      this._kibanaMap = new modules.KibanaMap(this._container, options);
      this._kibanaMap.setMinZoom(WMS_MINZOOM); //use a default
      this._kibanaMap.setMaxZoom(WMS_MAXZOOM); //use a default

      this._kibanaMap.addLegendControl();
      this._kibanaMap.addFitControl();
      this._kibanaMap.persistUiStateForVisualization(this.handlers.uiState);

      this._kibanaMap.on('baseLayer:loaded', () => {
        this._baseLayerDirty = false;
      });
      this._kibanaMap.on('baseLayer:loading', () => {
        this._baseLayerDirty = true;
      });
      await this._updateBaseLayer();
    }

    _tmsConfigured() {
      const { wms } = this._getMapsParams();
      const hasTmsBaseLayer = wms && !!wms.selectedTmsLayer;

      return hasTmsBaseLayer;
    }

    _wmsConfigured() {
      const { wms } = this._getMapsParams();
      const hasWmsBaseLayer = wms && !!wms.enabled;

      return hasWmsBaseLayer;
    }

    async _updateBaseLayer() {
      const emsTileLayerId = getEmsTileLayerId();

      if (!this._kibanaMap) {
        return;
      }

      const mapParams = this._getMapsParams();
      if (!this._tmsConfigured()) {
        try {
          const serviceSettings = await getServiceSettings();
          const tmsServices = await serviceSettings.getTMSServices();
          const userConfiguredTmsLayer = tmsServices[0];
          const initBasemapLayer = userConfiguredTmsLayer
            ? userConfiguredTmsLayer
            : tmsServices.find((s) => s.id === emsTileLayerId.bright);
          if (initBasemapLayer) {
            this._setTmsLayer(initBasemapLayer);
          }
        } catch (e) {
          getToasts().addWarning(e.message);
          return;
        }
        return;
      }

      try {
        if (this._wmsConfigured()) {
          if (WMS_MINZOOM > this._kibanaMap.getMaxZoomLevel()) {
            this._kibanaMap.setMinZoom(WMS_MINZOOM);
            this._kibanaMap.setMaxZoom(WMS_MAXZOOM);
          }

          this._kibanaMap.setBaseLayer({
            baseLayerType: 'wms',
            options: {
              minZoom: WMS_MINZOOM,
              maxZoom: WMS_MAXZOOM,
              url: mapParams.wms.url,
              ...mapParams.wms.options,
            },
          });
        } else if (this._tmsConfigured()) {
          const selectedTmsLayer = mapParams.wms.selectedTmsLayer;
          this._setTmsLayer(selectedTmsLayer);
        }
      } catch (tmsLoadingError) {
        getToasts().addWarning(tmsLoadingError.message);
      }
    }

    async _setTmsLayer(tmsLayer) {
      this._kibanaMap.setMinZoom(tmsLayer.minZoom);
      this._kibanaMap.setMaxZoom(tmsLayer.maxZoom);
      if (this._kibanaMap.getZoomLevel() > tmsLayer.maxZoom) {
        this._kibanaMap.setZoomLevel(tmsLayer.maxZoom);
      }
      let isDesaturated = this._getMapsParams().isDesaturated;
      if (typeof isDesaturated !== 'boolean') {
        isDesaturated = true;
      }
      const isDarkMode = getUiSettings().get('theme:darkMode');
      const serviceSettings = await getServiceSettings();
      const meta = await serviceSettings.getAttributesForTMSLayer(
        tmsLayer,
        isDesaturated,
        isDarkMode
      );
      const showZoomMessage = serviceSettings.shouldShowZoomMessage(tmsLayer);
      const options = { ...tmsLayer };
      delete options.id;
      delete options.subdomains;
      this._kibanaMap.setBaseLayer({
        baseLayerType: 'tms',
        options: { ...options, showZoomMessage, ...meta },
      });
    }

    async _updateData() {
      throw new Error(
        i18n.translate('maps_legacy.baseMapsVisualization.childShouldImplementMethodErrorMessage', {
          defaultMessage: 'Child should implement this method to respond to data-update',
        })
      );
    }

    _hasESResponseChanged(data) {
      return this._esResponse !== data;
    }

    /**
     * called on options change (vis.params change)
     */
    async _updateParams() {
      const mapParams = this._getMapsParams();
      await this._updateBaseLayer();
      this._kibanaMap.setLegendPosition(mapParams.legendPosition);
      this._kibanaMap.setShowTooltip(mapParams.addTooltip);
      this._kibanaMap.useUiStateFromVisualization(this.handlers.uiState);
    }

    _getMapsParams() {
      return this._params;
    }

    _whenBaseLayerIsLoaded() {
      if (!this._tmsConfigured()) {
        return true;
      }

      const maxTimeForBaseLayer = 10000;
      const interval$ = Rx.interval(10).pipe(filter(() => !this._baseLayerDirty));
      const timer$ = Rx.timer(maxTimeForBaseLayer);

      return Rx.race(interval$, timer$).pipe(first()).toPromise();
    }
  };
}
