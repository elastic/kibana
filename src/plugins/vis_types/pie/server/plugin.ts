/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { VisualizationsServerSetup } from '@kbn/visualizations-plugin/server';
import type { PieConfig } from './config';

interface PluginSetupDependencies {
  visualizations: VisualizationsServerSetup;
}

export class VisTypePieServerPlugin implements Plugin<object, object> {
  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
  }

  public setup(core: CoreSetup, plugins: PluginSetupDependencies) {
    const { readOnly } = this.initializerContext.config.get<PieConfig>();
    if (readOnly) {
      plugins.visualizations.registerReadOnlyVisType('pie');
    }

    return {};
  }

  public start() {
    return {};
  }
}
