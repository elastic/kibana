/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext, PluginConfigDescriptor } from '@kbn/core/server';
import { DashboardPlugin } from './plugin';
import { configSchema, ConfigSchema } from '../config';

export const config: PluginConfigDescriptor<ConfigSchema> = {
  exposeToBrowser: {
    allowByValueEmbeddables: true,
  },
  schema: configSchema,
};

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export function plugin(initializerContext: PluginInitializerContext) {
  return new DashboardPlugin(initializerContext);
}

export type { DashboardPluginSetup, DashboardPluginStart } from './types';
export { findByValueEmbeddables } from './usage/find_by_value_embeddables';
