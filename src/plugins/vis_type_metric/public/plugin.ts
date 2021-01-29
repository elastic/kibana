/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from 'kibana/public';
import { Plugin as ExpressionsPublicPlugin } from '../../expressions/public';
import { VisualizationsSetup } from '../../visualizations/public';

import { createMetricVisFn } from './metric_vis_fn';
import { createMetricVisTypeDefinition } from './metric_vis_type';
import { ChartsPluginSetup } from '../../charts/public';
import { DataPublicPluginStart } from '../../data/public';
import { setFormatService } from './services';
import { ConfigSchema } from '../config';
import { metricVisRenderer } from './metric_vis_renderer';

/** @internal */
export interface MetricVisPluginSetupDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  visualizations: VisualizationsSetup;
  charts: ChartsPluginSetup;
}

/** @internal */
export interface MetricVisPluginStartDependencies {
  data: DataPublicPluginStart;
}

/** @internal */
export class MetricVisPlugin implements Plugin<void, void> {
  initializerContext: PluginInitializerContext<ConfigSchema>;

  constructor(initializerContext: PluginInitializerContext<ConfigSchema>) {
    this.initializerContext = initializerContext;
  }

  public setup(
    core: CoreSetup,
    { expressions, visualizations, charts }: MetricVisPluginSetupDependencies
  ) {
    expressions.registerFunction(createMetricVisFn);
    expressions.registerRenderer(metricVisRenderer);
    visualizations.createBaseVisualization(createMetricVisTypeDefinition());
  }

  public start(core: CoreStart, { data }: MetricVisPluginStartDependencies) {
    setFormatService(data.fieldFormats);
  }
}
