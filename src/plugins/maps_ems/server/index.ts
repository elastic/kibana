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
import { MapsEmsConfig, emsConfigSchema } from '../config';

export const config: PluginConfigDescriptor<MapsEmsConfig> = {
  exposeToBrowser: {
    tilemap: true,
    includeElasticMapsService: true,
    proxyElasticMapsServiceInMaps: true,
    manifestServiceUrl: true,
    emsUrl: true,
    emsFileApiUrl: true,
    emsTileApiUrl: true,
    emsLandingPageUrl: true,
    emsFontLibraryUrl: true,
    emsTileLayerId: true,
  },
  schema: emsConfigSchema,
};

export interface MapsEmsPluginSetup {
  config: MapsEmsConfig;
}

export class MapsEmsPlugin implements Plugin<MapsEmsPluginSetup> {
  readonly _initializerContext: PluginInitializerContext<MapsEmsConfig>;

  constructor(initializerContext: PluginInitializerContext<MapsEmsConfig>) {
    this._initializerContext = initializerContext;
  }

  public setup(core: CoreSetup) {
    const emsPluginConfig = this._initializerContext.config.get();
    return {
      config: emsPluginConfig,
    };
  }

  public start() {}
}

export const plugin = (initializerContext: PluginInitializerContext) =>
  new MapsEmsPlugin(initializerContext);
