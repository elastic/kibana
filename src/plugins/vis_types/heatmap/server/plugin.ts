/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { VisualizationsServerSetup } from '@kbn/visualizations-plugin/server';
import { HeatmapConfig } from './config';

interface PluginSetupDependencies {
  visualizations: VisualizationsServerSetup;
}

export class VisTypeHeatmapServerPlugin implements Plugin<object, object> {
  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
  }

  public setup(core: CoreSetup, plugins: PluginSetupDependencies) {
    const { readOnly } = this.initializerContext.config.get<HeatmapConfig>();
    if (readOnly) {
      plugins.visualizations.registerReadOnlyVisType('heatmap');
    }

    return {};
  }

  public start() {
    return {};
  }
}
