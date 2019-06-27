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

import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import { KibanaMap } from 'ui/vis/map/kibana_map';
import * as Rx from 'rxjs';
import { filter, first } from 'rxjs/operators';
import 'ui/vis/map/service_settings';
import { toastNotifications } from 'ui/notify';
import { uiModules } from 'ui/modules';
import chrome from 'ui/chrome';

const WMS_MINZOOM = 0;
const WMS_MAXZOOM = 22;//increase this to 22. Better for WMS

const emsServiceSettings = new Promise((resolve) => {
  uiModules.get('kibana').run(($injector) => {
    const serviceSttings = $injector.get('serviceSettings');
    resolve(serviceSttings);
  });
});

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
    async render(esResponse, visParams, status) {
      if (!this._kibanaMap) {
        //the visualization has been destroyed;
        return;
      }

      await this._mapIsLoaded;

      if (status.resize) {
        this._kibanaMap.resize();
      }
      if (status.params || status.aggs) {
        this._params = visParams;
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
      this._kibanaMap.setMinZoom(WMS_MINZOOM);//use a default
      this._kibanaMap.setMaxZoom(WMS_MAXZOOM);//use a default

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


    _tmsConfigured() {
      const { wms } = this._getMapsParams();
      const hasTmsBaseLayer = !!wms.selectedTmsLayer;

      return hasTmsBaseLayer;
    }

    _wmsConfigured() {
      const { wms } = this._getMapsParams();
      const hasWmsBaseLayer = !!wms.enabled;

      return hasWmsBaseLayer;
    }

    async _updateBaseLayer() {

      const emsTileLayerId = chrome.getInjected('emsTileLayerId', true);

      if (!this._kibanaMap) {
        return;
      }

      const mapParams = this._getMapsParams();
      if (!this._tmsConfigured()) {
        try {
          const tmsServices = await serviceSettings.getTMSServices();
          const userConfiguredTmsLayer = tmsServices[0];
          const initBasemapLayer = userConfiguredTmsLayer
            ? userConfiguredTmsLayer
            : tmsServices.find(s => s.id === emsTileLayerId.bright);
          if (initBasemapLayer) { this._setTmsLayer(initBasemapLayer); }
        } catch (e) {
          toastNotifications.addWarning(e.message);
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
              ...mapParams.wms.options
            }
          });
        } else if (this._tmsConfigured()) {
          const selectedTmsLayer = mapParams.wms.selectedTmsLayer;
          this._setTmsLayer(selectedTmsLayer);
        }
      } catch (tmsLoadingError) {
        toastNotifications.addWarning(tmsLoadingError.message);
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
      const isDarkMode = chrome.getUiSettingsClient().get('theme:darkMode');
      const meta = await (await emsServiceSettings).getAttributesForTMSLayer(tmsLayer, isDesaturated, isDarkMode);
      const showZoomMessage = serviceSettings.shouldShowZoomMessage(tmsLayer);
      const options = _.cloneDeep(tmsLayer);
      delete options.id;
      delete options.subdomains;
      this._kibanaMap.setBaseLayer({
        baseLayerType: 'tms',
        options: { ...options, showZoomMessage, ...meta, }
      });
    }

    async _updateData() {
      throw new Error(i18n.translate('tileMap.baseMapsVisualization.childShouldImplementMethodErrorMessage', {
        defaultMessage: 'Child should implement this method to respond to data-update',
      }));
    }

    _hasESResponseChanged(data) {
      return this._chartData !== data;
    }

    /**
     * called on options change (vis.params change)
     */
    async _updateParams() {
      const mapParams = this._getMapsParams();
      await this._updateBaseLayer();
      this._kibanaMap.setLegendPosition(mapParams.legendPosition);
      this._kibanaMap.setShowTooltip(mapParams.addTooltip);
      this._kibanaMap.useUiStateFromVisualization(this.vis);
    }

    _getMapsParams() {
      return _.assign(
        {},
        this.vis.type.visConfig.defaults,
        { type: this.vis.type.name },
        this._params
      );
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
