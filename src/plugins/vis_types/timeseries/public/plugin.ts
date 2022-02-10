/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from 'kibana/public';
import { Plugin as ExpressionsPublicPlugin } from '../../../expressions/public';
import { VisualizationsSetup } from '../../../visualizations/public';
import { EditorController, TSVB_EDITOR_NAME } from './application/editor_controller';

import { createMetricsFn } from './metrics_fn';
import { metricsVisDefinition } from './metrics_type';
import {
  setUISettings,
  setI18n,
  setFieldFormats,
  setCoreStart,
  setDataStart,
  setCharts,
} from './services';
import { DataPublicPluginStart } from '../../../data/public';
import { ChartsPluginStart } from '../../../charts/public';
import { getTimeseriesVisRenderer } from './timeseries_vis_renderer';

/** @internal */
export interface MetricsPluginSetupDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  visualizations: VisualizationsSetup;
}

/** @internal */
export interface MetricsPluginStartDependencies {
  data: DataPublicPluginStart;
  charts: ChartsPluginStart;
}

/** @internal */
export class MetricsPlugin implements Plugin<void, void> {
  initializerContext: PluginInitializerContext;

  constructor(initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
  }

  public setup(core: CoreSetup, { expressions, visualizations }: MetricsPluginSetupDependencies) {
    visualizations.visEditorsRegistry.register(TSVB_EDITOR_NAME, EditorController);
    expressions.registerFunction(createMetricsFn);
    expressions.registerRenderer(
      getTimeseriesVisRenderer({
        uiSettings: core.uiSettings,
        theme: core.theme,
      })
    );
    setUISettings(core.uiSettings);
    visualizations.createBaseVisualization(metricsVisDefinition);
  }

  public start(core: CoreStart, { data, charts }: MetricsPluginStartDependencies) {
    setCharts(charts);
    setI18n(core.i18n);
    setFieldFormats(data.fieldFormats);
    setDataStart(data);
    setCoreStart(core);
  }
}
