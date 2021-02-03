/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PluginConfigDescriptor, PluginInitializerContext } from 'kibana/server';

import { configSchema, ConfigSchema } from '../config';
import { VisTypeVegaPlugin } from './plugin';

export const config: PluginConfigDescriptor<ConfigSchema> = {
  exposeToBrowser: {
    enableExternalUrls: true,
  },
  schema: configSchema,
  deprecations: ({ renameFromRoot }) => [
    renameFromRoot('vega.enableExternalUrls', 'vis_type_vega.enableExternalUrls'),
    renameFromRoot('vega.enabled', 'vis_type_vega.enabled'),
  ],
};

export function plugin(initializerContext: PluginInitializerContext) {
  return new VisTypeVegaPlugin(initializerContext);
}

export { VisTypeVegaPluginStart, VisTypeVegaPluginSetup } from './types';
