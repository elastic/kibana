/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { Map, StyleSpecification, MapOptions } from '@kbn/mapbox-gl';

import { View, parse } from 'vega';

import { maplibregl } from '@kbn/mapbox-gl';

import { initTmsRasterLayer, initVegaLayer } from './layers';
import { VegaBaseView } from '../vega_base_view';
import { getUISettings } from '../../services';

import { defaultMapConfig, defaultMabBoxStyle, vegaLayerId } from './constants';
import { validateZoomSettings, injectMapPropsIntoSpec } from './utils';
import './vega_map_view.scss';
import { TMS_IN_YML_ID } from './service_settings/service_settings_types';

async function updateVegaView(mapBoxInstance: Map, vegaView: View) {
  const mapCanvas = mapBoxInstance.getCanvas();
  const { lat, lng } = mapBoxInstance.getCenter();
  let shouldRender = false;

  const sendSignal = (sig: string, value: any) => {
    if (vegaView.signal(sig) !== value) {
      vegaView.signal(sig, value);
      shouldRender = true;
    }
  };

  sendSignal('width', mapCanvas.clientWidth);
  sendSignal('height', mapCanvas.clientHeight);
  sendSignal('latitude', lat);
  sendSignal('longitude', lng);
  sendSignal('zoom', mapBoxInstance.getZoom());

  if (shouldRender) {
    await vegaView.runAsync();
  }
}

export class VegaMapView extends VegaBaseView {
  private mapBoxInstance?: Map;

  private get shouldShowZoomControl() {
    return Boolean(this._parser.mapConfig.zoomControl);
  }

  private getMapParams(defaults: { maxZoom: number; minZoom: number }): Partial<MapOptions> {
    const { longitude, latitude, scrollWheelZoom } = this._parser.mapConfig;
    const { zoom, maxZoom, minZoom } = validateZoomSettings(
      this._parser.mapConfig,
      defaults,
      this.onWarn.bind(this)
    );
    const { signals } = this._vegaStateRestorer.restore() || {};

    return {
      maxZoom,
      minZoom,
      zoom: signals?.zoom ?? zoom,
      center: [signals?.longitude ?? longitude, signals?.latitude ?? latitude],
      scrollZoom: scrollWheelZoom,
    };
  }

  private async getEmsTileLayerId() {
    const { mapStyle, emsTileServiceId } = this._parser.mapConfig;
    //
    if (mapStyle) {
      const isDarkMode: boolean = getUISettings().get('theme:darkMode');
      return emsTileServiceId
        ? emsTileServiceId
        : await this._serviceSettings.getDefaultTmsLayer(isDarkMode);
    }
  }

  private async initMapContainer(vegaView: View) {
    let style: StyleSpecification = defaultMabBoxStyle;
    let customAttribution: MapOptions['customAttribution'] = [];
    const zoomSettings = {
      minZoom: defaultMapConfig.minZoom,
      maxZoom: defaultMapConfig.maxZoom,
    };

    const emsTileLayer = await this.getEmsTileLayerId();
    if (emsTileLayer && emsTileLayer !== TMS_IN_YML_ID) {
      const tmsService = await this._serviceSettings.getTmsService(emsTileLayer);

      if (!tmsService) {
        this.onWarn(
          i18n.translate('visTypeVega.mapView.mapStyleNotFoundWarningMessage', {
            defaultMessage: '{mapStyleParam} was not found',
            values: { mapStyleParam: `"emsTileServiceId":${emsTileLayer}` },
          })
        );
        return;
      }
      zoomSettings.maxZoom = defaultMapConfig.maxZoom;
      zoomSettings.minZoom = defaultMapConfig.minZoom;
      customAttribution = this._serviceSettings.getAttributionsFromTMSServce(tmsService);
      style = (await tmsService.getVectorStyleSheet()) as StyleSpecification;
    } else {
      const config = this._serviceSettings.getTileMapConfig();
      customAttribution = config.options.attribution;
    }

    // In some cases, Vega may be initialized twice, e.g. after awaiting...
    if (!this._$container) return;

    // For the correct geration of the PDF/PNG report, we must wait until the map is fully rendered.
    return new Promise((resolve) => {
      const mapBoxInstance = new maplibregl.Map({
        style,
        customAttribution,
        container: this._$container.get(0),
        ...this.getMapParams({ ...zoomSettings }),
      });

      const initMapComponents = () => {
        this.initControls(mapBoxInstance);
        this.initLayers(mapBoxInstance, vegaView, emsTileLayer);

        this._addDestroyHandler(() => {
          if (mapBoxInstance.getLayer(vegaLayerId)) {
            mapBoxInstance.removeLayer(vegaLayerId);
          }
          if (mapBoxInstance.getLayer(TMS_IN_YML_ID)) {
            mapBoxInstance.removeLayer(TMS_IN_YML_ID);
          }
          mapBoxInstance.remove();
        });

        resolve(mapBoxInstance);
      };

      mapBoxInstance.once('load', initMapComponents);
      this.mapBoxInstance = mapBoxInstance;
    });
  }

  private initControls(mapBoxInstance: Map) {
    if (this.shouldShowZoomControl) {
      mapBoxInstance.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
    }

    // disable map rotation using right click + drag
    mapBoxInstance.dragRotate.disable();

    // disable map rotation using touch rotation gesture
    mapBoxInstance.touchZoomRotate.disableRotation();
  }

  private initLayers(mapBoxInstance: Map, vegaView: View, emsTileLayer: string) {
    const shouldShowUserConfiguredLayer = emsTileLayer === TMS_IN_YML_ID;

    if (shouldShowUserConfiguredLayer) {
      const { url, options } = this._serviceSettings.getTileMapConfig();
      initTmsRasterLayer({
        id: TMS_IN_YML_ID,
        map: mapBoxInstance,
        context: {
          tiles: [url!],
          maxZoom: options.maxZoom ?? defaultMapConfig.maxZoom,
          minZoom: options.minZoom ?? defaultMapConfig.minZoom,
          tileSize: options.tileSize ?? defaultMapConfig.tileSize,
        },
      });
    }

    initVegaLayer({
      id: vegaLayerId,
      map: mapBoxInstance,
      context: {
        vegaView,
        vegaControls: this._$controls?.get(0),
        updateVegaView,
      },
    });
  }

  protected async _initViewCustomizations() {
    const vegaView = new View(
      parse(injectMapPropsIntoSpec(this._parser.spec), undefined, { ast: true }),
      this._vegaViewConfig
    );

    this.setDebugValues(vegaView, this._parser.spec, this._parser.vlspec);
    this.setView(vegaView);

    await this.initMapContainer(vegaView);
  }

  protected async onViewContainerResize() {
    this.mapBoxInstance?.resize();
  }
}
