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

import * as vega from 'vega-lib';
import { i18n } from '@kbn/i18n';
import { VegaBaseView } from './vega_base_view';
import { VegaMapLayer } from './vega_map_layer';
import { KibanaMap } from '../legacy_imports';
import { getEmsTileLayerId, getUISettings } from '../services';

export class VegaMapView extends VegaBaseView {
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
      baseMapOpts = tmsServices.find(s => s.id === mapStyle);
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
    //   maxBounds = L.latLngBounds(L.latLng(b[1], b[0]), L.latLng(b[3], b[2]));
    // }

    this._kibanaMap = new KibanaMap(this._$container.get(0), {
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

    const vegaMapLayer = new VegaMapLayer(this._parser.spec, {
      vega,
      bindingsContainer: this._$controls.get(0),
      delayRepaint: mapConfig.delayRepaint,
      viewConfig: this._vegaViewConfig,
      onWarning: this.onWarn.bind(this),
      onError: this.onError.bind(this),
    });

    this._kibanaMap.addLayer(vegaMapLayer);

    this._addDestroyHandler(() => {
      this._kibanaMap.removeLayer(vegaMapLayer);
      if (baseMapOpts) {
        this._kibanaMap.setBaseLayer(null);
      }
      this._kibanaMap.destroy();
    });

    const vegaView = vegaMapLayer.getVegaView();
    this.setDebugValues(vegaView, this._parser.spec, this._parser.vlspec);
    await this.setView(vegaView);
  }
}
