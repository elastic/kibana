/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CoreSetup, PluginConfigDescriptor } from 'kibana/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';

import { configSchema, ConfigSchema } from '../config';
import { registerVisTypeTableUsageCollector } from './usage_collector';

export const config: PluginConfigDescriptor<ConfigSchema> = {
  exposeToBrowser: {
    legacyVisEnabled: true,
  },
  schema: configSchema,
  deprecations: ({ renameFromRoot }) => [
    renameFromRoot('table_vis.enabled', 'vis_type_table.enabled'),
  ],
};

export const plugin = () => ({
  setup(core: CoreSetup, plugins: { usageCollection?: UsageCollectionSetup }) {
    if (plugins.usageCollection) {
      registerVisTypeTableUsageCollector(plugins.usageCollection);
    }
  },
  start() {},
});
