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

import { i18n } from '@kbn/i18n';
import { vega } from '../lib/vega';
import { VegaBaseView } from './vega_base_view';
import { VegaMapLayer } from './vega_map_layer';
import { getMapsLegacyConfig, getUISettings } from '../services';
import { lazyLoadMapsLegacyModules, TMS_IN_YML_ID } from '../../../maps_legacy/public';

const isUserConfiguredTmsLayer = ({ tilemap }) => Boolean(tilemap.url);

export class VegaMapView extends VegaBaseView {
  constructor(opts) {
    super(opts);
  }

  async getMapStyleOptions() {
    const isDarkMode = getUISettings().get('theme:darkMode');
    const mapsLegacyConfig = getMapsLegacyConfig();
    const tmsServices = await this._serviceSettings.getTMSServices();
    const mapConfig = this._parser.mapConfig;

    let mapStyle;

    if (mapConfig.mapStyle !== 'default') {
      mapStyle = mapConfig.mapStyle;
    } else {
      if (isUserConfiguredTmsLayer(mapsLegacyConfig)) {
        mapStyle = TMS_IN_YML_ID;
      } else {
        mapStyle = mapsLegacyConfig.emsTileLayerId.bright;
      }
    }

    const mapOptions = tmsServices.find((s) => s.id === mapStyle);

    if (!mapOptions) {
      this.onWarn(
        i18n.translate('visTypeVega.mapView.mapStyleNotFoundWarningMessage', {
          defaultMessage: '{mapStyleParam} was not found',
          values: { mapStyleParam: `"mapStyle":${mapStyle}` },
        })
      );
      return null;
    }

    return {
      ...mapOptions,
      ...(await this._serviceSettings.getAttributesForTMSLayer(mapOptions, true, isDarkMode)),
    };
  }

  async _initViewCustomizations() {
    const mapConfig = this._parser.mapConfig;
    let baseMapOpts;
    let limitMinZ = 0;
    let limitMaxZ = 25;

    // In some cases, Vega may be initialized twice, e.g. after awaiting...
    if (!this._$container) return;

    if (mapConfig.mapStyle !== false) {
      baseMapOpts = await this.getMapStyleOptions();

      if (baseMapOpts) {
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
