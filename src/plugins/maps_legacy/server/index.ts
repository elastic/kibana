/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Plugin, PluginConfigDescriptor } from 'kibana/server';
import { CoreSetup, PluginInitializerContext } from 'src/core/server';
import { Observable } from 'rxjs';
import { configSchema, MapsLegacyConfig } from '../config';
import { getUiSettings } from './ui_settings';

export const config: PluginConfigDescriptor<MapsLegacyConfig> = {
  exposeToBrowser: {
    includeElasticMapsService: true,
    proxyElasticMapsServiceInMaps: true,
    tilemap: true,
    regionmap: true,
    manifestServiceUrl: true,
    emsUrl: true,
    emsFileApiUrl: true,
    emsTileApiUrl: true,
    emsLandingPageUrl: true,
    emsFontLibraryUrl: true,
    emsTileLayerId: true,
  },
  schema: configSchema,
};

export interface MapsLegacyPluginSetup {
  config$: Observable<MapsLegacyConfig>;
}

export class MapsLegacyPlugin implements Plugin<MapsLegacyPluginSetup> {
  readonly _initializerContext: PluginInitializerContext<MapsLegacyConfig>;

  constructor(initializerContext: PluginInitializerContext<MapsLegacyConfig>) {
    this._initializerContext = initializerContext;
  }

  public setup(core: CoreSetup) {
    core.uiSettings.register(getUiSettings());

    // @ts-ignore
    const config$ = this._initializerContext.config.create();
    return {
      config$,
    };
  }

  public start() {}
}

export const plugin = (initializerContext: PluginInitializerContext) =>
  new MapsLegacyPlugin(initializerContext);
