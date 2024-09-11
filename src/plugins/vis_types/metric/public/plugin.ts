/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { VisualizationsSetup } from '@kbn/visualizations-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { createMetricVisTypeDefinition } from './metric_vis_type';
import type { MetricPublicConfig } from '../server/config';
import { setDataViewsStart } from './services';

/** @internal */
export interface MetricVisPluginSetupDependencies {
  visualizations: VisualizationsSetup;
}

/** @internal */
export interface MetricVisPluginStartDependencies {
  dataViews: DataViewsPublicPluginStart;
}

/** @internal */
export class MetricVisPlugin
  implements Plugin<void, void, MetricVisPluginSetupDependencies, MetricVisPluginStartDependencies>
{
  initializerContext: PluginInitializerContext<MetricPublicConfig>;

  constructor(initializerContext: PluginInitializerContext<MetricPublicConfig>) {
    this.initializerContext = initializerContext;
  }

  public setup(core: CoreSetup, { visualizations }: MetricVisPluginSetupDependencies) {
    const { readOnly } = this.initializerContext.config.get<MetricPublicConfig>();
    visualizations.createBaseVisualization({
      ...createMetricVisTypeDefinition(),
      disableCreate: Boolean(readOnly),
      disableEdit: Boolean(readOnly),
    });
  }

  public start(core: CoreStart, { dataViews }: MetricVisPluginStartDependencies) {
    setDataViewsStart(dataViews);
  }
}
