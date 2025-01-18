/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreSetup, PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import type { VisualizationsServerSetup } from '@kbn/visualizations-plugin/server';

import { configSchema, MetricConfig } from './config';

export const config: PluginConfigDescriptor<MetricConfig> = {
  exposeToBrowser: {
    readOnly: true,
  },
  schema: configSchema,
};

interface PluginSetupDependencies {
  visualizations: VisualizationsServerSetup;
}

export const plugin = async (initializerContext: PluginInitializerContext) => ({
  setup(core: CoreSetup, plugins: PluginSetupDependencies) {
    const { readOnly } = initializerContext.config.get<MetricConfig>();
    if (readOnly) {
      plugins.visualizations.registerReadOnlyVisType('metric');
    }

    return {};
  },
  start() {},
});
