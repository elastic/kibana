/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';
import MarkdownIt from 'markdown-it';
import type { EMSClient, FileLayer as EMSFileLayer, TMSService } from '@elastic/ems-client';
import type { MapConfig, TileMapConfig } from '@kbn/maps-ems-plugin/public';
import {
  EMS_DARKMAP_BOREALIS_ID,
  EMS_ROADMAP_BOREALIS_DESATURATED_ID,
} from '@kbn/maps-ems-plugin/common';
import type { FileLayer, IServiceSettings, TmsLayer } from './service_settings_types';
import { ORIGIN_LEGACY, TMS_IN_YML_ID } from './service_settings_types';
/**
 * This class provides access to the EMS-layers and the kibana.yml configured layers through a single interface.
 */
export class ServiceSettings implements IServiceSettings {
  private readonly _mapConfig: MapConfig;
  private readonly _tilemapsConfig: TileMapConfig;
  private readonly _hasTmsConfigured: boolean;
  private readonly _emsClient: EMSClient;
  private readonly tmsOptionsFromConfig: any;

  constructor(mapConfig: MapConfig, tilemapsConfig: TileMapConfig, emsClient: EMSClient) {
    this._mapConfig = mapConfig;
    this._tilemapsConfig = tilemapsConfig;
    this._hasTmsConfigured = typeof tilemapsConfig.url === 'string' && tilemapsConfig.url !== '';

    this._emsClient = emsClient;

    const markdownIt = new MarkdownIt({
      html: false,
      linkify: true,
    });

    // TMS Options
    this.tmsOptionsFromConfig = _.assign({}, this._tilemapsConfig.options, {
      attribution: _.escape(markdownIt.render(this._tilemapsConfig.options.attribution || '')),
      url: this._tilemapsConfig.url,
    });
  }

  getMapConfig(): MapConfig {
    return this._mapConfig;
  }

  getTileMapConfig(): TileMapConfig {
    return this._tilemapsConfig;
  }

  _backfillSettings = (fileLayer: EMSFileLayer): FileLayer => {
    // Older version of Kibana stored EMS state in the URL-params
    // Creates object literal with required parameters as key-value pairs
    const format = fileLayer.getDefaultFormatType();
    const meta = fileLayer.getDefaultFormatMeta();

    return {
      name: fileLayer.getDisplayName(),
      origin: ORIGIN_LEGACY.EMS,
      id: fileLayer.getId(),
      created_at: fileLayer.getCreatedAt(),
      attribution: getAttributionString(fileLayer),
      fields: fileLayer.getFieldsInLanguage(),
      format, // legacy: format and meta are split up
      meta, // legacy, format and meta are split up
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
    if (this._hasTmsConfigured) {
      // use tilemap.* settings from yml
      const tmsService: TmsLayer = {
        ..._.cloneDeep(this.tmsOptionsFromConfig),
        id: TMS_IN_YML_ID,
        origin: ORIGIN_LEGACY.KIBANA_YML,
      };

      allServices.push(tmsService);
    }

    if (this._mapConfig.includeElasticMapsService && !this._mapConfig.emsUrl) {
      const servicesFromManifest = await this._emsClient.getTMSServices();
      const strippedServiceFromManifest: TmsLayer[] = await Promise.all(
        servicesFromManifest
          .filter((tmsService) => tmsService.getId() === this._mapConfig.emsTileLayerId.bright)
          .map(async (tmsService: TMSService) => {
            // shim for compatibility
            return {
              origin: ORIGIN_LEGACY.EMS,
              id: tmsService.getId(),
              minZoom: (await tmsService.getMinZoom()) as number,
              maxZoom: (await tmsService.getMaxZoom()) as number,
              attribution: getAttributionString(tmsService),
            };
          })
      );
      allServices = allServices.concat(strippedServiceFromManifest);
    }

    return allServices;
  }

  async getTmsService(id: string) {
    return this._emsClient.findTMSServiceById(id);
  }

  async getDefaultTmsLayer(isDarkMode: boolean, themeName: string): Promise<string> {
    const { dark, desaturated } = this._mapConfig.emsTileLayerId;

    if (hasUserConfiguredTmsLayer(this._mapConfig)) {
      return TMS_IN_YML_ID;
    }

    // To be removed once Borealis is the only theme available
    if (themeName === 'borealis') {
      return isDarkMode ? EMS_DARKMAP_BOREALIS_ID : EMS_ROADMAP_BOREALIS_DESATURATED_ID;
    }

    return isDarkMode ? dark : desaturated;
  }

  async _getAttributesForEMSTMSLayer(isDesaturated: boolean, isDarkMode: boolean) {
    const tmsServices = await this._emsClient.getTMSServices();
    const emsTileLayerId = this._mapConfig.emsTileLayerId;
    let serviceId: string;
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
      url: await tmsService!.getUrlTemplate(),
      minZoom: await tmsService!.getMinZoom(),
      maxZoom: await tmsService!.getMaxZoom(),
      attribution: getAttributionString(tmsService!),
      origin: ORIGIN_LEGACY.EMS,
    };
  }

  async getAttributesForTMSLayer(
    tmsServiceConfig: TmsLayer,
    isDesaturated: boolean,
    isDarkMode: boolean
  ) {
    if (tmsServiceConfig.origin === ORIGIN_LEGACY.EMS) {
      return this._getAttributesForEMSTMSLayer(isDesaturated, isDarkMode);
    } else if (tmsServiceConfig.origin === ORIGIN_LEGACY.KIBANA_YML) {
      const attrs = _.pick(this._tilemapsConfig, ['url', 'minzoom', 'maxzoom', 'attribution']);
      return { ...attrs, ...{ origin: ORIGIN_LEGACY.KIBANA_YML } };
    } else {
      // this is an older config. need to resolve this dynamically.
      if (tmsServiceConfig.id === TMS_IN_YML_ID) {
        const attrs = _.pick(this._tilemapsConfig, ['url', 'minzoom', 'maxzoom', 'attribution']);
        return { ...attrs, ...{ origin: ORIGIN_LEGACY.KIBANA_YML } };
      } else {
        // assume ems
        return this._getAttributesForEMSTMSLayer(isDesaturated, isDarkMode);
      }
    }
  }

  async _getFileUrlFromEMS(fileLayerConfig: FileLayer) {
    const fileLayers = await this._emsClient.getFileLayers();
    const layer = fileLayers.find((fileLayer) => {
      const hasIdByName = fileLayer.hasId(fileLayerConfig.name); // legacy
      const hasIdById = fileLayer.hasId(fileLayerConfig.id);
      return hasIdByName || hasIdById;
    });

    if (layer) {
      return layer.getDefaultFormatUrl();
    } else {
      throw new Error(`File  ${fileLayerConfig.name} not recognized`);
    }
  }

  async getUrlForRegionLayer(fileLayerConfig: FileLayer): Promise<string | undefined> {
    let url;
    if (fileLayerConfig.origin === ORIGIN_LEGACY.EMS) {
      url = this._getFileUrlFromEMS(fileLayerConfig);
    } else if (
      fileLayerConfig.layerId &&
      fileLayerConfig.layerId.startsWith(`${ORIGIN_LEGACY.EMS}.`)
    ) {
      // fallback for older saved objects
      url = this._getFileUrlFromEMS(fileLayerConfig);
    } else if (
      fileLayerConfig.layerId &&
      fileLayerConfig.layerId.startsWith(`${ORIGIN_LEGACY.KIBANA_YML}.`)
    ) {
      // fallback for older saved objects
      url = fileLayerConfig.url;
    } else {
      // generic fallback
      url = fileLayerConfig.url;
    }
    return url;
  }

  getAttributionsFromTMSServce(tmsService: TMSService): string {
    return getAttributionString(tmsService);
  }
}

function getAttributionString(emsService: EMSFileLayer | TMSService): string {
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
  return attributionSnippets.join(' | '); // !!!this is the current convention used in Kibana
}

function hasUserConfiguredTmsLayer(config: MapConfig) {
  return Boolean(config.tilemap?.url);
}
