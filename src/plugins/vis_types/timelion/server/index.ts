/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginConfigDescriptor, PluginInitializerContext } from '../../../../../src/core/server';
import { configSchema, ConfigSchema } from '../config';
import { TimelionPlugin } from './plugin';

export const config: PluginConfigDescriptor<ConfigSchema> = {
  schema: configSchema,
  deprecations: ({ renameFromRoot, unused }) => [
    renameFromRoot('timelion_vis.enabled', 'vis_type_timelion.enabled', { level: 'critical' }),
    renameFromRoot('timelion.enabled', 'vis_type_timelion.enabled', { level: 'critical' }),
    renameFromRoot('timelion.graphiteUrls', 'vis_type_timelion.graphiteUrls', {
      level: 'critical',
    }),
    // Unused properties which should be removed after releasing Kibana v8.0:
    renameFromRoot('timelion.ui.enabled', 'vis_type_timelion.ui.enabled', {
      silent: true,
      level: 'critical',
    }),
    unused('ui.enabled', { level: 'critical' }),
  ],
};

export const plugin = (initializerContext: PluginInitializerContext) =>
  new TimelionPlugin(initializerContext);
