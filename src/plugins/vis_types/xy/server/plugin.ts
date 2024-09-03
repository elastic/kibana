/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { VisualizationsServerSetup } from '@kbn/visualizations-plugin/server';
import type { XyConfig } from './config';

interface PluginSetupDependencies {
  visualizations: VisualizationsServerSetup;
}

export class VisTypeXYServerPlugin implements Plugin {
  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
  }

  public setup(core: CoreSetup, plugins: PluginSetupDependencies) {
    const { readOnly } = this.initializerContext.config.get<XyConfig>();
    if (readOnly) {
      plugins.visualizations.registerReadOnlyVisType('area');
      plugins.visualizations.registerReadOnlyVisType('histogram');
      plugins.visualizations.registerReadOnlyVisType('horizontal_bar');
      plugins.visualizations.registerReadOnlyVisType('line');
    }

    return {};
  }

  public start() {
    return {};
  }
}
