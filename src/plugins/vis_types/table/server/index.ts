/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, PluginConfigDescriptor } from '@kbn/core/server';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';

import { configSchema, ConfigSchema } from '../config';
import { registerVisTypeTableUsageCollector } from './usage_collector';

export const config: PluginConfigDescriptor<ConfigSchema> = {
  schema: configSchema,
};

export const plugin = () => ({
  setup(core: CoreSetup, plugins: { usageCollection?: UsageCollectionSetup }) {
    if (plugins.usageCollection) {
      registerVisTypeTableUsageCollector(plugins.usageCollection);
    }
  },
  start() {},
});
