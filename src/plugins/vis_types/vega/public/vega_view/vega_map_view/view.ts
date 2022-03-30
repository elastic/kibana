/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { Map, Style, MapboxOptions } from '@kbn/mapbox-gl';

import { View, parse, expressionFunction } from 'vega';

import { mapboxgl } from '@kbn/mapbox-gl';

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

type SetMapViewArgs =
  | [number, number, number]
  | [number, number]
  | [[number, number], number]
  | [[number, number]]
  | [[[number, number], [number, number]]];

expressionFunction(
  'setMapView',
  function handlerFwd(
    this: {
      context: { dataflow: { _kibanaView: VegaMapView; runAfter: (fn: () => void) => void } };
    },
    ...args: SetMapViewArgs
  ) {
    const view = this.context.dataflow;
    view.runAfter(() => view._kibanaView.setMapViewHandler(...args));
  }
);

export class VegaMapView extends VegaBaseView {
  private mapBoxInstance?: Map;

  private get shouldShowZoomControl() {
    return Boolean(this._parser.mapConfig.zoomControl);
  }

  private getMapParams(defaults: { maxZoom: number; minZoom: number }): Partial<MapboxOptions> {
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
    let style: Style = defaultMabBoxStyle;
    let customAttribution: MapboxOptions['customAttribution'] = [];
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
      style = (await tmsService.getVectorStyleSheet()) as Style;
    } else {
      const config = this._serviceSettings.getTileMapConfig();
      customAttribution = config.options.attribution;
    }

    // In some cases, Vega may be initialized twice, e.g. after awaiting...
    if (!this._$container) return;

    // For the correct geration of the PDF/PNG report, we must wait until the map is fully rendered.
    return new Promise((resolve) => {
      const mapBoxInstance = new mapboxgl.Map({
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
      mapBoxInstance.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-left');
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

  public setMapViewHandler(...args: SetMapViewArgs) {
    if (!this.mapBoxInstance) {
      return;
    }
    function throwError() {
      throw new Error(
        i18n.translate('visTypeVega.visualization.setMapViewErrorMessage', {
          defaultMessage:
            'Unexpected setMapView() parameters. It could be called with a bounding box setMapView([[longitude1,latitude1],[longitude2,latitude2]]), or it could be the center point setMapView([longitude, latitude], optional_zoom), or it can be used as setMapView(latitude, longitude, optional_zoom)',
        })
      );
    }

    function checkArray(
      val: number | [number, number] | [[number, number], [number, number]]
    ): [number, number] {
      if (
        !Array.isArray(val) ||
        val.length !== 2 ||
        typeof val[0] !== 'number' ||
        typeof val[1] !== 'number'
      ) {
        throwError();
      }
      return val as [number, number];
    }

    let lng: number | undefined;
    let lat: number | undefined;
    let zoom: number | undefined;
    switch (args.length) {
      default:
        throwError();
        break;
      case 1: {
        const arg = args[0];
        if (
          Array.isArray(arg) &&
          arg.length === 2 &&
          Array.isArray(arg[0]) &&
          Array.isArray(arg[1])
        ) {
          // called with a bounding box, need to reverse order
          const [lng1, lat1] = checkArray(arg[0]);
          const [lng2, lat2] = checkArray(arg[1]);
          this.mapBoxInstance.fitBounds([
            { lat: lat1, lng: lng1 },
            { lat: lat2, lng: lng2 },
          ]);
        } else {
          // called with a center point and no zoom
          [lng, lat] = checkArray(arg);
        }
        break;
      }
      case 2:
        if (Array.isArray(args[0])) {
          [lng, lat] = checkArray(args[0]);
          zoom = args[1];
        } else {
          [lat, lng] = args;
        }
        break;
      case 3:
        [lat, lng, zoom] = args;
        break;
    }

    if (lat !== undefined && lng !== undefined) {
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        throwError();
      }
      if (zoom !== undefined && typeof zoom !== 'number') {
        throwError();
      }
      this.mapBoxInstance.setCenter({ lat, lng });
      if (zoom !== undefined) {
        this.mapBoxInstance.zoomTo(zoom);
      }
    }
  }
}
