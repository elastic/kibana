/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import type { ConfigSchema } from './config';
import { configSchema } from './config';
import type { KQLServerPlugin, KQLServerPluginSetup, KQLServerPluginStart } from './plugin';

/**
 * Static code to be shared externally
 * @public
 */

export async function plugin(initializerContext: PluginInitializerContext<ConfigSchema>) {
  const { KQLServerPlugin } = await import('./plugin');
  return new KQLServerPlugin(initializerContext);
}

export type { KQLServerPluginSetup as PluginSetup, KQLServerPluginStart as PluginStart };
export type { KQLServerPlugin as Plugin };

export const config: PluginConfigDescriptor<ConfigSchema> = {
  exposeToBrowser: {
    autocomplete: true,
  },
  schema: configSchema,
};
