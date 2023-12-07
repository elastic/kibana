/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  PluginConfigDescriptor,
  PluginInitializer,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import { configSchema, type NoDataPageConfig } from '../config';

export const config: PluginConfigDescriptor<NoDataPageConfig> = {
  exposeToBrowser: {
    analyticsNoDataPageFlavor: true,
  },
  schema: configSchema,
};

export const plugin: PluginInitializer<{}, {}, {}, NoDataPagePluginStartDeps> = async (
  initializerContext: PluginInitializerContext
) => {
  const { NoDataPagePlugin } = await import('./plugin');
  return new NoDataPagePlugin(initializerContext);
};

export interface NoDataPagePluginStartDeps {
  security?: SecurityPluginStart;
}
