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
import MarkdownIt from 'markdown-it';
import { EMSClient } from '@elastic/ems-client';
import { i18n } from '@kbn/i18n';
import { getKibanaVersion } from '../kibana_services';
import { ORIGIN } from '../common/constants/origin';

const TMS_IN_YML_ID = 'TMS in config/kibana.yml';

export class ServiceSettings {
  constructor(mapConfig, tilemapsConfig) {
    this._mapConfig = mapConfig;
    this._tilemapsConfig = tilemapsConfig;

    this._showZoomMessage = true;
    this._emsClient = new EMSClient({
      language: i18n.getLocale(),
      appVersion: getKibanaVersion(),
      appName: 'kibana',
      fileApiUrl: this._mapConfig.emsFileApiUrl,
      tileApiUrl: this._mapConfig.emsTileApiUrl,
      landingPageUrl: this._mapConfig.emsLandingPageUrl,
      // Wrap to avoid errors passing window fetch
      fetchFunction: function (...args) {
        return fetch(...args);
      },
    });
    this.getTMSOptions();
  }

  getTMSOptions() {
    const markdownIt = new MarkdownIt({
      html: false,
      linkify: true,
    });

    // TMS attribution
    const attributionFromConfig = _.escape(
      markdownIt.render(this._tilemapsConfig.deprecated.config.options.attribution || '')
    );
    // TMS Options
    this.tmsOptionsFromConfig = _.assign({}, this._tilemapsConfig.deprecated.config.options, {
      attribution: attributionFromConfig,
    });
  }

  shouldShowZoomMessage({ origin }) {
    return origin === ORIGIN.EMS && this._showZoomMessage;
  }

  enableZoomMessage() {
    this._showZoomMessage = true;
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

  _backfillSettings = (fileLayer) => {
    // Older version of Kibana stored EMS state in the URL-params
    // Creates object literal with required parameters as key-value pairs
    const format = fileLayer.getDefaultFormatType();
    const meta = fileLayer.getDefaultFormatMeta();

    return {
      name: fileLayer.getDisplayName(),
      origin: fileLayer.getOrigin(),
      id: fileLayer.getId(),
      created_at: fileLayer.getCreatedAt(),
      attribution: getAttributionString(fileLayer),
      fields: fileLayer.getFieldsInLanguage(),
      format: format, //legacy: format and meta are split up
      meta: meta, //legacy, format and meta are split up
    };
  };

  async getFileLayers() {
    if (!this._mapConfig.includeElasticMapsService) {
      return [];
    }

    const fileLayers = await this._emsClient.getFileLayers();
    return fileLayers.map(this._backfillSettings);
  }

  /**
   * Returns all the services published by EMS (if configures)
   * It also includes the service configured in tilemap (override)
   */
  async getTMSServices() {
    let allServices = [];
    if (this._tilemapsConfig.deprecated.isOverridden) {
      //use tilemap.* settings from yml
      const tmsService = _.cloneDeep(this.tmsOptionsFromConfig);
      tmsService.id = TMS_IN_YML_ID;
      tmsService.origin = ORIGIN.KIBANA_YML;
      allServices.push(tmsService);
    }

    if (this._mapConfig.includeElasticMapsService) {
      const servicesFromManifest = await this._emsClient.getTMSServices();
      const strippedServiceFromManifest = await Promise.all(
        servicesFromManifest
          .filter((tmsService) => tmsService.getId() === this._mapConfig.emsTileLayerId.bright)
          .map(async (tmsService) => {
            //shim for compatibility
            return {
              origin: tmsService.getOrigin(),
              id: tmsService.getId(),
              minZoom: await tmsService.getMinZoom(),
              maxZoom: await tmsService.getMaxZoom(),
              attribution: getAttributionString(tmsService),
            };
          })
      );
      allServices = allServices.concat(strippedServiceFromManifest);
    }

    return allServices;
  }

  /**
   * Set optional query-parameters for all requests
   *
   * @param additionalQueryParams
   */
  setQueryParams(additionalQueryParams) {
    // Functions more as a "set" than an "add" in ems-client
    this._emsClient.addQueryParams(additionalQueryParams);
  }

  async getFileLayerFromConfig(fileLayerConfig) {
    const fileLayers = await this._emsClient.getFileLayers();
    return fileLayers.find((fileLayer) => {
      const hasIdByName = fileLayer.hasId(fileLayerConfig.name); //legacy
      const hasIdById = fileLayer.hasId(fileLayerConfig.id);
      return hasIdByName || hasIdById;
    });
  }

  async getEMSHotLink(fileLayerConfig) {
    const layer = await this.getFileLayerFromConfig(fileLayerConfig);
    return layer ? layer.getEMSHotLink() : null;
  }

  async loadFileLayerConfig(fileLayerConfig) {
    const fileLayer = await this.getFileLayerFromConfig(fileLayerConfig);
    return fileLayer ? this._backfillSettings(fileLayer) : null;
  }

  async _getAttributesForEMSTMSLayer(isDesaturated, isDarkMode) {
    const tmsServices = await this._emsClient.getTMSServices();
    const emsTileLayerId = this._mapConfig.emsTileLayerId;
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
    const tmsService = tmsServices.find((service) => {
      return service.getId() === serviceId;
    });
    return {
      url: await tmsService.getUrlTemplate(),
      minZoom: await tmsService.getMinZoom(),
      maxZoom: await tmsService.getMaxZoom(),
      attribution: getAttributionString(tmsService),
      origin: ORIGIN.EMS,
    };
  }

  async getAttributesForTMSLayer(tmsServiceConfig, isDesaturated, isDarkMode) {
    if (tmsServiceConfig.origin === ORIGIN.EMS) {
      return this._getAttributesForEMSTMSLayer(isDesaturated, isDarkMode);
    } else if (tmsServiceConfig.origin === ORIGIN.KIBANA_YML) {
      const config = this._tilemapsConfig.deprecated.config;
      const attrs = _.pick(config, ['url', 'minzoom', 'maxzoom', 'attribution']);
      return { ...attrs, ...{ origin: ORIGIN.KIBANA_YML } };
    } else {
      //this is an older config. need to resolve this dynamically.
      if (tmsServiceConfig.id === TMS_IN_YML_ID) {
        const config = this._tilemapsConfig.deprecated.config;
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
    const layer = fileLayers.find((fileLayer) => {
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
    } else if (fileLayerConfig.layerId && fileLayerConfig.layerId.startsWith(`${ORIGIN.EMS}.`)) {
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

function getAttributionString(emsService) {
  const attributions = emsService.getAttributions();
  const attributionSnippets = attributions.map((attribution) => {
    const anchorTag = document.createElement('a');
    anchorTag.setAttribute('rel', 'noreferrer noopener');
    if (attribution.url.startsWith('http://') || attribution.url.startsWith('https://')) {
      anchorTag.setAttribute('href', attribution.url);
    }
    anchorTag.textContent = attribution.label;
    return anchorTag.outerHTML;
  });
  return attributionSnippets.join(' | '); //!!!this is the current convention used in Kibana
}
