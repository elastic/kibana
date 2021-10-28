/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from 'kibana/public';
import { VisualizationsSetup } from '../../../visualizations/public';
import { createMetricVisTypeDefinition } from './metric_vis_type';
import { ConfigSchema } from '../config';

/** @internal */
export interface MetricVisPluginSetupDependencies {
  visualizations: VisualizationsSetup;
}

/** @internal */
export class MetricVisPlugin implements Plugin<void, void> {
  initializerContext: PluginInitializerContext<ConfigSchema>;

  constructor(initializerContext: PluginInitializerContext<ConfigSchema>) {
    this.initializerContext = initializerContext;
  }

  public setup(core: CoreSetup, { visualizations }: MetricVisPluginSetupDependencies) {
    visualizations.createBaseVisualization(createMetricVisTypeDefinition());
  }

  public start(core: CoreStart) {}
}
