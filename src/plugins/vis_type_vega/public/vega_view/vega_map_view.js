/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { vega } from '../lib/vega';
import { VegaBaseView } from './vega_base_view';
import { VegaMapLayer } from './vega_map_layer';
import { getEmsTileLayerId, getUISettings } from '../services';
import { lazyLoadMapsLegacyModules } from '../../../maps_legacy/public';

export class VegaMapView extends VegaBaseView {
  constructor(opts) {
    super(opts);
  }

  async _initViewCustomizations() {
    const mapConfig = this._parser.mapConfig;
    let baseMapOpts;
    let limitMinZ = 0;
    let limitMaxZ = 25;

    if (mapConfig.mapStyle !== false) {
      const tmsServices = await this._serviceSettings.getTMSServices();
      // In some cases, Vega may be initialized twice, e.g. after awaiting...
      if (!this._$container) return;
      const emsTileLayerId = getEmsTileLayerId();
      const mapStyle =
        mapConfig.mapStyle === 'default' ? emsTileLayerId.bright : mapConfig.mapStyle;
      const isDarkMode = getUISettings().get('theme:darkMode');
      baseMapOpts = tmsServices.find((s) => s.id === mapStyle);
      baseMapOpts = {
        ...baseMapOpts,
        ...(await this._serviceSettings.getAttributesForTMSLayer(baseMapOpts, true, isDarkMode)),
      };
      if (!baseMapOpts) {
        this.onWarn(
          i18n.translate('visTypeVega.mapView.mapStyleNotFoundWarningMessage', {
            defaultMessage: '{mapStyleParam} was not found',
            values: { mapStyleParam: `"mapStyle": ${JSON.stringify(mapStyle)}` },
          })
        );
      } else {
        limitMinZ = baseMapOpts.minZoom;
        limitMaxZ = baseMapOpts.maxZoom;
      }
    }

    const validate = (name, value, dflt, min, max) => {
      if (value === undefined) {
        value = dflt;
      } else if (value < min) {
        this.onWarn(
          i18n.translate('visTypeVega.mapView.resettingPropertyToMinValueWarningMessage', {
            defaultMessage: 'Resetting {name} to {min}',
            values: { name: `"${name}"`, min },
          })
        );
        value = min;
      } else if (value > max) {
        this.onWarn(
          i18n.translate('visTypeVega.mapView.resettingPropertyToMaxValueWarningMessage', {
            defaultMessage: 'Resetting {name} to {max}',
            values: { name: `"${name}"`, max },
          })
        );
        value = max;
      }
      return value;
    };

    let minZoom = validate('minZoom', mapConfig.minZoom, limitMinZ, limitMinZ, limitMaxZ);
    let maxZoom = validate('maxZoom', mapConfig.maxZoom, limitMaxZ, limitMinZ, limitMaxZ);
    if (minZoom > maxZoom) {
      this.onWarn(
        i18n.translate('visTypeVega.mapView.minZoomAndMaxZoomHaveBeenSwappedWarningMessage', {
          defaultMessage: '{minZoomPropertyName} and {maxZoomPropertyName} have been swapped',
          values: {
            minZoomPropertyName: '"minZoom"',
            maxZoomPropertyName: '"maxZoom"',
          },
        })
      );
      [minZoom, maxZoom] = [maxZoom, minZoom];
    }
    const zoom = validate('zoom', mapConfig.zoom, 2, minZoom, maxZoom);

    // let maxBounds = null;
    // if (mapConfig.maxBounds) {
    //   const b = mapConfig.maxBounds;
    // eslint-disable-next-line no-undef
    //   maxBounds = L.latLngBounds(L.latLng(b[1], b[0]), L.latLng(b[3], b[2]));
    // }

    const modules = await lazyLoadMapsLegacyModules();

    this._kibanaMap = new modules.KibanaMap(this._$container.get(0), {
      zoom,
      minZoom,
      maxZoom,
      center: [mapConfig.latitude, mapConfig.longitude],
      zoomControl: mapConfig.zoomControl,
      scrollWheelZoom: mapConfig.scrollWheelZoom,
    });

    if (baseMapOpts) {
      this._kibanaMap.setBaseLayer({
        baseLayerType: 'tms',
        options: baseMapOpts,
      });
    }

    const vegaMapLayer = new VegaMapLayer(
      this._parser.spec,
      {
        vega,
        bindingsContainer: this._$controls.get(0),
        delayRepaint: mapConfig.delayRepaint,
        viewConfig: this._vegaViewConfig,
        onWarning: this.onWarn.bind(this),
        onError: this.onError.bind(this),
      },
      modules.L
    );

    this._kibanaMap.addLayer(vegaMapLayer);

    this._addDestroyHandler(() => {
      this._kibanaMap.removeLayer(vegaMapLayer);
      if (baseMapOpts) {
        this._kibanaMap.setBaseLayer(null);
      }
      this._kibanaMap.destroy();
    });

    const vegaView = vegaMapLayer.getVegaView();
    await this.setView(vegaView);
    this.setDebugValues(vegaView, this._parser.spec, this._parser.vlspec);
  }
}
