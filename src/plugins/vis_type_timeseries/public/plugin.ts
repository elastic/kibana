/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import './application/index.scss';

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from 'kibana/public';
import { Plugin as ExpressionsPublicPlugin } from '../../expressions/public';
import { VisualizationsSetup } from '../../visualizations/public';
import { VisualizePluginSetup } from '../../visualize/public';
import { EditorController, TSVB_EDITOR_NAME } from './application';

import { createMetricsFn } from './metrics_fn';
import { metricsVisDefinition } from './metrics_type';
import {
  setSavedObjectsClient,
  setUISettings,
  setI18n,
  setFieldFormats,
  setCoreStart,
  setDataStart,
  setChartsSetup,
} from './services';
import { DataPublicPluginStart } from '../../data/public';
import { ChartsPluginSetup } from '../../charts/public';
import { getTimeseriesVisRenderer } from './timeseries_vis_renderer';

/** @internal */
export interface MetricsPluginSetupDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  visualizations: VisualizationsSetup;
  charts: ChartsPluginSetup;
  visualize: VisualizePluginSetup;
}

/** @internal */
export interface MetricsPluginStartDependencies {
  data: DataPublicPluginStart;
}

/** @internal */
export class MetricsPlugin implements Plugin<Promise<void>, void> {
  initializerContext: PluginInitializerContext;

  constructor(initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
  }

  public async setup(
    core: CoreSetup,
    { expressions, visualizations, charts, visualize }: MetricsPluginSetupDependencies
  ) {
    visualize.visEditorsRegistry.register(TSVB_EDITOR_NAME, EditorController);
    expressions.registerFunction(createMetricsFn);
    expressions.registerRenderer(
      getTimeseriesVisRenderer({
        uiSettings: core.uiSettings,
      })
    );
    setUISettings(core.uiSettings);
    setChartsSetup(charts);
    visualizations.createBaseVisualization(metricsVisDefinition);
  }

  public start(core: CoreStart, { data }: MetricsPluginStartDependencies) {
    setSavedObjectsClient(core.savedObjects);
    setI18n(core.i18n);
    setFieldFormats(data.fieldFormats);
    setDataStart(data);
    setCoreStart(core);
  }
}
