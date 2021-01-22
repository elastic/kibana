/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import type { EMSClient, TMSService } from '@elastic/ems-client';
import { getUISettings } from '../../services';
import { TmsTileLayers } from './tms_tile_layers';
import type { MapsLegacyConfig } from '../../../../maps_legacy/config';

type EmsClientConfig = ConstructorParameters<typeof EMSClient>[0];

const hasUserConfiguredTmsService = (config: MapsLegacyConfig) => Boolean(config.tilemap?.url);

const initEmsClientAsync = async (config: Partial<EmsClientConfig>) => {
  /**
   * Build optimization: '@elastic/ems-client' should be loaded from a separate chunk
   */
  const emsClientModule = await import('@elastic/ems-client');

  return new emsClientModule.EMSClient({
    language: i18n.getLocale(),
    appName: 'kibana',
    // Wrap to avoid errors passing window fetch
    fetchFunction(input: RequestInfo, init?: RequestInit) {
      return fetch(input, init);
    },
    ...config,
  } as EmsClientConfig);
};

export class MapServiceSettings {
  private emsClient?: EMSClient;
  private isDarkMode: boolean = false;

  constructor(public config: MapsLegacyConfig, private appVersion: string) {}

  public get isInitialized() {
    return Boolean(this.emsClient);
  }

  public get hasUserConfiguredTmsLayer() {
    return hasUserConfiguredTmsService(this.config);
  }

  public get defaultTmsLayer() {
    if (this.hasUserConfiguredTmsLayer) {
      return TmsTileLayers.userConfigured;
    }
    return this.isDarkMode ? TmsTileLayers.dark : TmsTileLayers.bright;
  }

  public async initialize() {
    this.isDarkMode = getUISettings().get('theme:darkMode');

    this.emsClient = await initEmsClientAsync({
      appVersion: this.appVersion,
      fileApiUrl: this.config.emsFileApiUrl,
      tileApiUrl: this.config.emsTileApiUrl,
      landingPageUrl: this.config.emsLandingPageUrl,
    });
  }

  public getTmsService(tmsTileLayer: TmsTileLayers | string = TmsTileLayers.desaturated) {
    return this.emsClient?.findTMSServiceById(tmsTileLayer);
  }

  public getAttributionsForTmsService(tmsService: TMSService) {
    return tmsService.getAttributions().map(({ label, url }) => {
      const anchorTag = document.createElement('a');

      anchorTag.textContent = label;
      anchorTag.setAttribute('rel', 'noreferrer noopener');
      anchorTag.setAttribute('href', url);

      return anchorTag.outerHTML;
    });
  }
}
