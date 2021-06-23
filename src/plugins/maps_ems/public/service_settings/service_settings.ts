/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import MarkdownIt from 'markdown-it';
import { EMSClient, FileLayer as EMSFileLayer, TMSService } from '@elastic/ems-client';
import { i18n } from '@kbn/i18n';
import { getKibanaVersion } from '../kibana_services';
import { FileLayer, IServiceSettings, TmsLayer } from './service_settings_types';
import { ORIGIN, TMS_IN_YML_ID } from '../../common';
import type { MapsEmsConfig, TileMapConfig } from '../../config';

/**
 * This class provides access to the EMS-layers and the kibana.yml configured layers through a single interface.
 */
export class ServiceSettings implements IServiceSettings {
  private readonly _mapConfig: MapsEmsConfig;
  private readonly _tilemapsConfig: TileMapConfig;
  private readonly _hasTmsConfigured: boolean;
  private readonly _emsClient: EMSClient;
  private readonly tmsOptionsFromConfig: any;

  constructor(mapConfig: MapsEmsConfig, tilemapsConfig: TileMapConfig) {
    this._mapConfig = mapConfig;
    this._tilemapsConfig = tilemapsConfig;
    this._hasTmsConfigured = typeof tilemapsConfig.url === 'string' && tilemapsConfig.url !== '';

    this._emsClient = new EMSClient({
      language: i18n.getLocale(),
      appVersion: getKibanaVersion(),
      appName: 'kibana',
      fileApiUrl: this._mapConfig.emsFileApiUrl,
      tileApiUrl: this._mapConfig.emsTileApiUrl,
      landingPageUrl: this._mapConfig.emsLandingPageUrl,
      // Wrap to avoid errors passing window fetch
      fetchFunction(...args: any[]) {
        // @ts-expect-error
        return fetch(...args);
      },
    });
    // any kibana user, regardless of distribution, should get all zoom levels
    // use `sspl` license to indicate this
    this._emsClient.addQueryParams({ license: 'sspl' });

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

  __debugStubManifestCalls(manifestRetrieval: () => Promise<unknown>): { removeStub: () => void } {
    const oldGetManifest = this._emsClient.getManifest;

    // This legacy code used for debugging/testing only.
    // @ts-expect-error
    this._emsClient.getManifest = manifestRetrieval;
    return {
      removeStub: () => {
        // @ts-expect-error
        delete this._emsClient.getManifest;
        // not strictly necessary since this is prototype method
        if (this._emsClient.getManifest !== oldGetManifest) {
          this._emsClient.getManifest = oldGetManifest;
        }
      },
    };
  }

  _backfillSettings = (fileLayer: EMSFileLayer): FileLayer => {
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
        origin: ORIGIN.KIBANA_YML,
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
              origin: tmsService.getOrigin(),
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

  /**
   * Set optional query-parameters for all requests
   *
   * @param additionalQueryParams
   */
  setQueryParams(additionalQueryParams: { [p: string]: string }) {
    // Functions more as a "set" than an "add" in ems-client
    this._emsClient.addQueryParams(additionalQueryParams);
  }

  async getFileLayerFromConfig(fileLayerConfig: FileLayer): Promise<EMSFileLayer | undefined> {
    const fileLayers = await this._emsClient.getFileLayers();
    return fileLayers.find((fileLayer) => {
      const hasIdByName = fileLayer.hasId(fileLayerConfig.name); // legacy
      const hasIdById = fileLayer.hasId(fileLayerConfig.id);
      return hasIdByName || hasIdById;
    });
  }

  async getEMSHotLink(fileLayerConfig: FileLayer): Promise<string | null> {
    const layer = await this.getFileLayerFromConfig(fileLayerConfig);
    return layer ? layer.getEMSHotLink() : null;
  }

  async loadFileLayerConfig(fileLayerConfig: FileLayer): Promise<FileLayer | null> {
    const fileLayer = await this.getFileLayerFromConfig(fileLayerConfig);
    return fileLayer ? this._backfillSettings(fileLayer) : null;
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
      origin: ORIGIN.EMS,
    };
  }

  async getAttributesForTMSLayer(
    tmsServiceConfig: TmsLayer,
    isDesaturated: boolean,
    isDarkMode: boolean
  ) {
    if (tmsServiceConfig.origin === ORIGIN.EMS) {
      return this._getAttributesForEMSTMSLayer(isDesaturated, isDarkMode);
    } else if (tmsServiceConfig.origin === ORIGIN.KIBANA_YML) {
      const attrs = _.pick(this._tilemapsConfig, ['url', 'minzoom', 'maxzoom', 'attribution']);
      return { ...attrs, ...{ origin: ORIGIN.KIBANA_YML } };
    } else {
      // this is an older config. need to resolve this dynamically.
      if (tmsServiceConfig.id === TMS_IN_YML_ID) {
        const attrs = _.pick(this._tilemapsConfig, ['url', 'minzoom', 'maxzoom', 'attribution']);
        return { ...attrs, ...{ origin: ORIGIN.KIBANA_YML } };
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
    if (fileLayerConfig.origin === ORIGIN.EMS) {
      url = this._getFileUrlFromEMS(fileLayerConfig);
    } else if (fileLayerConfig.layerId && fileLayerConfig.layerId.startsWith(`${ORIGIN.EMS}.`)) {
      // fallback for older saved objects
      url = this._getFileUrlFromEMS(fileLayerConfig);
    } else if (
      fileLayerConfig.layerId &&
      fileLayerConfig.layerId.startsWith(`${ORIGIN.KIBANA_YML}.`)
    ) {
      // fallback for older saved objects
      url = fileLayerConfig.url;
    } else {
      // generic fallback
      url = fileLayerConfig.url;
    }
    return url;
  }

  async getJsonForRegionLayer(fileLayerConfig: FileLayer) {
    const url = await this.getUrlForRegionLayer(fileLayerConfig);
    const response = await fetch(url!);
    return await response.json();
  }
}

function getAttributionString(emsService: EMSFileLayer | TMSService) {
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
