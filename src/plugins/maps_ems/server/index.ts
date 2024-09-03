/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext, PluginConfigDescriptor } from '@kbn/core/server';
import { MapConfig, mapConfigSchema } from './config';
export type { EMSSettings } from '../common';
export type { MapsEmsPluginServerSetup } from './plugin';

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

export const plugin = async (initializerContext: PluginInitializerContext) => {
  const { MapsEmsPlugin } = await import('./plugin');
  return new MapsEmsPlugin(initializerContext);
};
