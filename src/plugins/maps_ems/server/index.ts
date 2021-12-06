/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  CoreSetup,
  PluginInitializerContext,
  Plugin,
  PluginConfigDescriptor,
} from 'src/core/server';
import { MapConfig, mapConfigSchema } from '../config';
import { EMSSettings } from '../common';
import { IEMSConfig } from '../common/ems_settings';
export type { EMSSettings } from '../common';

export const config: PluginConfigDescriptor<MapConfig> = {
  exposeToBrowser: {
    tilemap: true,
    includeElasticMapsService: true,
    emsUrl: true,
    emsFileApiUrl: true,
    emsTileApiUrl: true,
    emsLandingPageUrl: true,
    emsFontLibraryUrl: true,
    emsTileLayerId: true,
  },
  schema: mapConfigSchema,
};

export interface MapsEmsPluginSetup {
  config: MapConfig;
  createEMSSettings: (config: IEMSConfig, getIsEnterPrisePlus: () => boolean) => EMSSettings;
}

export class MapsEmsPlugin implements Plugin<MapsEmsPluginSetup> {
  readonly _initializerContext: PluginInitializerContext<MapConfig>;

  constructor(initializerContext: PluginInitializerContext<MapConfig>) {
    this._initializerContext = initializerContext;
  }

  public setup(core: CoreSetup) {
    const emsPluginConfig = this._initializerContext.config.get();
    return {
      config: emsPluginConfig,
      createEMSSettings: (emsConfig: IEMSConfig, getIsEnterPrisePlus: () => boolean) => {
        return new EMSSettings(emsConfig, getIsEnterPrisePlus);
      },
    };
  }

  public start() {}
}

export const plugin = (initializerContext: PluginInitializerContext) =>
  new MapsEmsPlugin(initializerContext);
