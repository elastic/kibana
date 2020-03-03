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

import { uiModules } from '../../modules';
import _ from 'lodash';
import MarkdownIt from 'markdown-it';
import { ORIGIN } from '../../../../core_plugins/tile_map/common/origin';
import { EMSClient } from '@elastic/ems-client';
import { i18n } from '@kbn/i18n';
import 'angular-sanitize';

const markdownIt = new MarkdownIt({
  html: false,
  linkify: true,
});

const TMS_IN_YML_ID = 'TMS in config/kibana.yml';

uiModules
  .get('kibana', ['ngSanitize'])
  .service('serviceSettings', function($sanitize, mapConfig, tilemapsConfig, kbnVersion) {
    const attributionFromConfig = $sanitize(
      markdownIt.render(tilemapsConfig.deprecated.config.options.attribution || '')
    );
    const tmsOptionsFromConfig = _.assign({}, tilemapsConfig.deprecated.config.options, {
      attribution: attributionFromConfig,
    });

    class ServiceSettings {
      constructor() {
        this._showZoomMessage = true;
        this._emsClient = new EMSClient({
          language: i18n.getLocale(),
          kbnVersion: kbnVersion,
          fileApiUrl: mapConfig.emsFileApiUrl,
          tileApiUrl: mapConfig.emsTileApiUrl,
          htmlSanitizer: $sanitize,
          landingPageUrl: mapConfig.emsLandingPageUrl,
        });
      }

      shouldShowZoomMessage({ origin }) {
        return origin === ORIGIN.EMS && this._showZoomMessage;
      }

      disableZoomMessage() {
        this._showZoomMessage = false;
      }

      __debugStubManifestCalls(manifestRetrieval) {
        const oldGetManifest = this._emsClient.getManifest;
        this._emsClient.getManifest = manifestRetrieval;
        return {
          removeStub: () => {
            delete this._emsClient.getManifest;
            //not strictly necessary since this is prototype method
            if (this._emsClient.getManifest !== oldGetManifest) {
              this._emsClient.getManifest = oldGetManifest;
            }
          },
        };
      }

      async getFileLayers() {
        if (!mapConfig.includeElasticMapsService) {
          return [];
        }

        const fileLayers = await this._emsClient.getFileLayers();
        return fileLayers.map(fileLayer => {
          //backfill to older settings
          const format = fileLayer.getDefaultFormatType();
          const meta = fileLayer.getDefaultFormatMeta();

          return {
            name: fileLayer.getDisplayName(),
            origin: fileLayer.getOrigin(),
            id: fileLayer.getId(),
            created_at: fileLayer.getCreatedAt(),
            attribution: fileLayer.getHTMLAttribution(),
            fields: fileLayer.getFieldsInLanguage(),
            format: format, //legacy: format and meta are split up
            meta: meta, //legacy, format and meta are split up
          };
        });
      }

      /**
       * Returns all the services published by EMS (if configures)
       * It also includes the service configured in tilemap (override)
       */
      async getTMSServices() {
        let allServices = [];
        if (tilemapsConfig.deprecated.isOverridden) {
          //use tilemap.* settings from yml
          const tmsService = _.cloneDeep(tmsOptionsFromConfig);
          tmsService.id = TMS_IN_YML_ID;
          tmsService.origin = ORIGIN.KIBANA_YML;
          allServices.push(tmsService);
        }

        if (mapConfig.includeElasticMapsService) {
          const servicesFromManifest = await this._emsClient.getTMSServices();
          const strippedServiceFromManifest = await Promise.all(
            servicesFromManifest
              .filter(tmsService => tmsService.getId() === mapConfig.emsTileLayerId.bright)
              .map(async tmsService => {
                //shim for compatibility
                const shim = {
                  origin: tmsService.getOrigin(),
                  id: tmsService.getId(),
                  minZoom: await tmsService.getMinZoom(),
                  maxZoom: await tmsService.getMaxZoom(),
                  attribution: tmsService.getHTMLAttribution(),
                };
                return shim;
              })
          );
          allServices = allServices.concat(strippedServiceFromManifest);
        }

        return allServices;
      }

      /**
       * Add optional query-parameters to all requests
       *
       * @param additionalQueryParams
       */
      addQueryParams(additionalQueryParams) {
        this._emsClient.addQueryParams(additionalQueryParams);
      }

      async getEMSHotLink(fileLayerConfig) {
        const fileLayers = await this._emsClient.getFileLayers();
        const layer = fileLayers.find(fileLayer => {
          const hasIdByName = fileLayer.hasId(fileLayerConfig.name); //legacy
          const hasIdById = fileLayer.hasId(fileLayerConfig.id);
          return hasIdByName || hasIdById;
        });
        return layer ? layer.getEMSHotLink() : null;
      }

      async _getAttributesForEMSTMSLayer(isDesaturated, isDarkMode) {
        const tmsServices = await this._emsClient.getTMSServices();
        const emsTileLayerId = mapConfig.emsTileLayerId;
        let serviceId;
        if (isDarkMode) {
          serviceId = emsTileLayerId.dark;
        } else {
          if (isDesaturated) {
            serviceId = emsTileLayerId.desaturated;
          } else {
            serviceId = emsTileLayerId.bright;
          }
        }
        const tmsService = tmsServices.find(service => {
          return service.getId() === serviceId;
        });
        return {
          url: await tmsService.getUrlTemplate(),
          minZoom: await tmsService.getMinZoom(),
          maxZoom: await tmsService.getMaxZoom(),
          attribution: await tmsService.getHTMLAttribution(),
          origin: ORIGIN.EMS,
        };
      }

      async getAttributesForTMSLayer(tmsServiceConfig, isDesaturated, isDarkMode) {
        if (tmsServiceConfig.origin === ORIGIN.EMS) {
          return this._getAttributesForEMSTMSLayer(isDesaturated, isDarkMode);
        } else if (tmsServiceConfig.origin === ORIGIN.KIBANA_YML) {
          const config = tilemapsConfig.deprecated.config;
          const attrs = _.pick(config, ['url', 'minzoom', 'maxzoom', 'attribution']);
          return { ...attrs, ...{ origin: ORIGIN.KIBANA_YML } };
        } else {
          //this is an older config. need to resolve this dynamically.
          if (tmsServiceConfig.id === TMS_IN_YML_ID) {
            const config = tilemapsConfig.deprecated.config;
            const attrs = _.pick(config, ['url', 'minzoom', 'maxzoom', 'attribution']);
            return { ...attrs, ...{ origin: ORIGIN.KIBANA_YML } };
          } else {
            //assume ems
            return this._getAttributesForEMSTMSLayer(isDesaturated, isDarkMode);
          }
        }
      }

      async _getFileUrlFromEMS(fileLayerConfig) {
        const fileLayers = await this._emsClient.getFileLayers();
        const layer = fileLayers.find(fileLayer => {
          const hasIdByName = fileLayer.hasId(fileLayerConfig.name); //legacy
          const hasIdById = fileLayer.hasId(fileLayerConfig.id);
          return hasIdByName || hasIdById;
        });

        if (layer) {
          return layer.getDefaultFormatUrl();
        } else {
          throw new Error(`File  ${fileLayerConfig.name} not recognized`);
        }
      }

      async getUrlForRegionLayer(fileLayerConfig) {
        let url;
        if (fileLayerConfig.origin === ORIGIN.EMS) {
          url = this._getFileUrlFromEMS(fileLayerConfig);
        } else if (
          fileLayerConfig.layerId &&
          fileLayerConfig.layerId.startsWith(`${ORIGIN.EMS}.`)
        ) {
          //fallback for older saved objects
          url = this._getFileUrlFromEMS(fileLayerConfig);
        } else if (
          fileLayerConfig.layerId &&
          fileLayerConfig.layerId.startsWith(`${ORIGIN.KIBANA_YML}.`)
        ) {
          //fallback for older saved objects
          url = fileLayerConfig.url;
        } else {
          //generic fallback
          url = fileLayerConfig.url;
        }
        return url;
      }

      async getJsonForRegionLayer(fileLayerConfig) {
        const url = await this.getUrlForRegionLayer(fileLayerConfig);
        const response = await fetch(url);
        return await response.json();
      }
    }

    return new ServiceSettings();
  });
