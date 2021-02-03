/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PluginConfigDescriptor, PluginInitializerContext } from '../../../../src/core/server';
import { configSchema, ConfigSchema } from '../config';
import { Plugin } from './plugin';

export { PluginSetupContract } from './plugin';

export const config: PluginConfigDescriptor<ConfigSchema> = {
  schema: configSchema,
  exposeToBrowser: {
    ui: true,
  },
  deprecations: ({ renameFromRoot }) => [
    renameFromRoot('timelion_vis.enabled', 'vis_type_timelion.enabled'),
    renameFromRoot('timelion.enabled', 'vis_type_timelion.enabled'),
    renameFromRoot('timelion.graphiteUrls', 'vis_type_timelion.graphiteUrls'),
    renameFromRoot('timelion.ui.enabled', 'vis_type_timelion.ui.enabled', true),
  ],
};
export const plugin = (initializerContext: PluginInitializerContext) =>
  new Plugin(initializerContext);
