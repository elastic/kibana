/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import type { VisualizationsServerSetup } from '@kbn/visualizations-plugin/server';
import { configSchema, TableConfig } from '../config';
import { VIS_TYPE_TABLE } from '../common';

export const config: PluginConfigDescriptor<TableConfig> = {
  exposeToBrowser: {
    readOnly: true,
  },
  schema: configSchema,
};

interface PluginSetupDependencies {
  visualizations: VisualizationsServerSetup;
}

export const plugin = (initializerContext: PluginInitializerContext) => ({
  setup(core: CoreSetup, plugins: PluginSetupDependencies) {
    const { readOnly } = initializerContext.config.get<TableConfig>();
    if (readOnly) {
      plugins.visualizations.registerReadOnlyVisType(VIS_TYPE_TABLE);
    }

    return {};
  },
  start() {},
});
