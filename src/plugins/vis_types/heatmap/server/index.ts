/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import { configSchema, HeatmapConfig } from '../config';
import { VisTypeHeatmapServerPlugin } from './plugin';

export const config: PluginConfigDescriptor<HeatmapConfig> = {
  exposeToBrowser: {
    readOnly: true,
  },
  schema: configSchema,
};

export const plugin = (initializerContext: PluginInitializerContext) =>
  new VisTypeHeatmapServerPlugin(initializerContext);
