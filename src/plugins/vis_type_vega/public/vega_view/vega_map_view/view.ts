/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { throttle } from 'lodash';
import { Map, Style, NavigationControl, MapboxOptions } from 'mapbox-gl';

// @ts-ignore
// eslint-disable-next-line import/no-extraneous-dependencies
import Vsi from 'vega-spec-injector';

import { VegaBaseView } from '../vega_base_view';
import type { MapServiceSettings } from './map_service_settings';
import { initTmsRasterLayer, initVegaLayer } from './layers';
import { TmsTileLayers } from './tms_tile_layers';
import { getMapServiceSettings } from '../../services';

import {
  defaultMapConfig,
  defaultMabBoxStyle,
  defaultProjection,
  userConfiguredLayerId,
  vegaLayerId,
} from './constants';

import { validateZoomSettings } from './validataion_helper';

// @ts-ignore
import { vega } from '../../lib/vega';

import 'mapbox-gl/dist/mapbox-gl.css';

export class VegaMapView extends VegaBaseView {
  private mapServiceSettings: MapServiceSettings = getMapServiceSettings();

  private get mapStyle() {
    const { mapStyle } = this._parser.mapConfig;

    return mapStyle === 'default' ? this.mapServiceSettings.defaultTmsLayer : mapStyle;
  }

  private get shouldShowZoomControl() {
    return Boolean(this._parser.mapConfig.zoomControl);
  }

  private getMapParams(defaults: { maxZoom: number; minZoom: number }): Partial<MapboxOptions> {
    const { longitude, latitude, scrollWheelZoom } = this._parser.mapConfig;
    const zoomSettings = validateZoomSettings(this._parser.mapConfig, defaults, this.onWarn);

    return {
      ...zoomSettings,
      center: [longitude, latitude],
      scrollZoom: scrollWheelZoom,
    };
  }

  private initVegaView(): vega.View {
    const vsi = new Vsi();

    vsi.overrideField(this._parser.spec, 'autosize', 'none');
    vsi.addToList(this._parser.spec, 'signals', ['zoom', 'latitude', 'longitude']);
    vsi.addToList(this._parser.spec, 'projections', [defaultProjection]);

    const vegaView = new vega.View(vega.parse(this._parser.spec), this._vegaViewConfig);

    return vegaView;
  }

  private async initMapContainer(vegaView: vega.View) {
    let style: Style = defaultMabBoxStyle;
    let customAttribution: MapboxOptions['customAttribution'] = [];
    const zoomSettings = {
      minZoom: defaultMapConfig.minZoom,
      maxZoom: defaultMapConfig.maxZoom,
    };

    if (this.mapStyle !== TmsTileLayers.userConfigured) {
      const tmsService = await this.mapServiceSettings.getTmsService(this.mapStyle);

      if (!tmsService) {
        this.onWarn(
          i18n.translate('visTypeVega.mapView.mapStyleNotFoundWarningMessage', {
            defaultMessage: '{mapStyleParam} was not found',
            values: { mapStyleParam: `"mapStyle":${this.mapStyle}` },
          })
        );
        return;
      }
      zoomSettings.maxZoom = (await tmsService.getMaxZoom()) ?? defaultMapConfig.maxZoom;
      zoomSettings.minZoom = (await tmsService.getMinZoom()) ?? defaultMapConfig.minZoom;
      customAttribution = await this.mapServiceSettings.getAttributionsForTmsService(tmsService);
      style = (await tmsService.getVectorStyleSheet()) as Style;
    } else {
      customAttribution = this.mapServiceSettings.config.tilemap.options.attribution;
    }

    // In some cases, Vega may be initialized twice, e.g. after awaiting...
    if (!this._$container) return;

    const mapBoxInstance = new Map({
      style,
      customAttribution,
      container: this._$container.get(0),
      ...this.getMapParams({ ...zoomSettings }),
    });

    const initMapComponents = () => {
      this.initControls(mapBoxInstance);
      this.initLayers(mapBoxInstance, vegaView);

      this._addDestroyHandler(() => {
        if (mapBoxInstance.getLayer(vegaLayerId)) {
          mapBoxInstance.removeLayer(vegaLayerId);
        }
        if (mapBoxInstance.getLayer(userConfiguredLayerId)) {
          mapBoxInstance.removeLayer(userConfiguredLayerId);
        }
        mapBoxInstance.remove();
      });
    };

    mapBoxInstance.once('load', initMapComponents);
  }

  private async updateVegaView(mapBoxInstance: Map, vegaView: vega.View) {
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

  private initControls(mapBoxInstance: Map) {
    if (this.shouldShowZoomControl) {
      mapBoxInstance.addControl(new NavigationControl({ showCompass: false }), 'top-left');
    }
  }

  private initLayers(mapBoxInstance: Map, vegaView: vega.View) {
    const shouldShowUserConfiguredLayer = this.mapStyle === TmsTileLayers.userConfigured;

    if (shouldShowUserConfiguredLayer) {
      const { url, options } = this.mapServiceSettings.config.tilemap;

      initTmsRasterLayer({
        id: userConfiguredLayerId,
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
        vegaParser: this._parser,
        vegaView,
        addDestroyHandler: this._addDestroyHandler,
        updateVegaView: throttle(this.updateVegaView, 8),
      },
    });
  }

  public async _initViewCustomizations() {
    if (!this.mapServiceSettings.isInitialized) {
      await this.mapServiceSettings.initialize();
    }

    const vegaView = this.initVegaView();

    this.setDebugValues(vegaView, this._parser.spec, this._parser.vlspec);
    this.setView(vegaView);

    await this.initMapContainer(vegaView);
  }
}
