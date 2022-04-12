/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginConfigDescriptor, PluginInitializerContext } from '../../../core/server';
import { ConfigSchema, configSchema } from '../config';
import {
  UnifiedSearchServerPlugin,
  UnifiedSearchServerPluginSetup,
  UnifiedSearchServerPluginStart,
} from './plugin';

import { autocompleteConfigDeprecationProvider } from './config_deprecations';

/**
 * Static code to be shared externally
 * @public
 */

export function plugin(initializerContext: PluginInitializerContext<ConfigSchema>) {
  return new UnifiedSearchServerPlugin(initializerContext);
}

export type {
  UnifiedSearchServerPluginSetup as PluginSetup,
  UnifiedSearchServerPluginStart as PluginStart,
};
export { UnifiedSearchServerPlugin as Plugin };

export const config: PluginConfigDescriptor<ConfigSchema> = {
  deprecations: autocompleteConfigDeprecationProvider,
  exposeToBrowser: {
    autocomplete: true,
  },
  schema: configSchema,
};
