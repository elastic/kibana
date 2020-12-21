/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import { EMSClient, TMSService } from '@elastic/ems-client';
import { TmsTileLayers } from './tms_tile_layers';
import { MapsLegacyConfig } from '../../../../maps_legacy/config';
import { getUISettings } from '../../services';

const hasUserConfiguredTmsService = (config: MapsLegacyConfig) => Boolean(config.tilemap?.url);

export class MapServiceSettings {
  public readonly hasUserConfiguredTmsLayer = hasUserConfiguredTmsService(this.config);
  public readonly isRetina = window.devicePixelRatio === 2;
  private readonly emsClient: EMSClient;
  private readonly uiSettingsValues = {
    isDarkMode: getUISettings().get('theme:darkMode'),
  };

  constructor(public config: MapsLegacyConfig, appVersion: string) {
    this.emsClient = new EMSClient({
      language: i18n.getLocale(),
      appVersion,
      appName: 'kibana',
      fileApiUrl: config.emsFileApiUrl,
      tileApiUrl: config.emsTileApiUrl,
      landingPageUrl: config.emsLandingPageUrl,
      // Wrap to avoid errors passing window fetch
      fetchFunction(input: RequestInfo, init?: RequestInit) {
        return fetch(input, init);
      },
    });
  }

  public get defaultTmsLayer() {
    if (this.hasUserConfiguredTmsLayer) {
      return TmsTileLayers.userConfigured;
    }
    return this.uiSettingsValues.isDarkMode ? TmsTileLayers.dark : TmsTileLayers.desaturated;
  }

  public getTmsService(tmsTileLayer: TmsTileLayers | string = TmsTileLayers.desaturated) {
    return this.emsClient.findTMSServiceById(tmsTileLayer);
  }

  public getAttributionsForTmsService(tmsService: TMSService) {
    return tmsService.getAttributions().map(({ label, url }) => {
      const anchorTag = document.createElement('a');

      anchorTag.setAttribute('rel', 'noreferrer noopener');
      if (url.startsWith('http://') || url.startsWith('https://')) {
        anchorTag.setAttribute('href', url);
      }
      anchorTag.textContent = label;

      return anchorTag.outerHTML;
    });
  }
}
