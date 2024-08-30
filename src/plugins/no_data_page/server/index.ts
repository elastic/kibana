/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginConfigDescriptor } from '@kbn/core-plugins-server';

import { configSchema, NoDataPageConfig } from './config';

export const config: PluginConfigDescriptor<NoDataPageConfig> = {
  exposeToBrowser: {
    analyticsNoDataPageFlavor: true,
  },
  schema: configSchema,
};

export function plugin() {
  return new (class NoDataPagePlugin {
    setup() {}
    start() {}
  })();
}
