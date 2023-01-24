/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { Plugin as ExpressionsPublicPlugin } from '@kbn/expressions-plugin/public';
import type { VisualizationsSetup } from '@kbn/visualizations-plugin/public';
import type { DataPublicPluginStart, TimefilterContract } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { HttpSetup } from '@kbn/core-http-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';

import { EditorController, TSVB_EDITOR_NAME } from './application/editor_controller';

import { createMetricsFn } from './metrics_fn';
import { metricsVisDefinition } from './metrics_type';
import {
  setUISettings,
  setI18n,
  setFieldFormats,
  setCoreStart,
  setDataStart,
  setDataViewsStart,
  setCharts,
  setUsageCollectionStart,
  setUnifiedSearchStart,
} from './services';
import { getTimeseriesVisRenderer } from './timeseries_vis_renderer';

/** @internal */
export interface MetricsPluginSetupDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  visualizations: VisualizationsSetup;
}

/** @internal */
export interface MetricsPluginStartDependencies {
  data: DataPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  dataViews: DataViewsPublicPluginStart;
  charts: ChartsPluginStart;
  usageCollection: UsageCollectionStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
}

/** @internal */
export interface TimeseriesVisDependencies extends Partial<CoreStart> {
  uiSettings: IUiSettingsClient;
  http: HttpSetup;
  timefilter: TimefilterContract;
  theme: ThemeServiceStart;
  appName: string;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  notifications: CoreStart['notifications'];
  storage: IStorageWrapper;
  data: DataPublicPluginStart;
  usageCollection?: UsageCollectionStart;
  docLinks: DocLinksStart;
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

  public start(
    core: CoreStart,
    {
      data,
      charts,
      dataViews,
      usageCollection,
      fieldFormats,
      unifiedSearch,
    }: MetricsPluginStartDependencies
  ) {
    setCharts(charts);
    setI18n(core.i18n);
    setFieldFormats(fieldFormats);
    setDataStart(data);
    setUnifiedSearchStart(unifiedSearch);
    setDataViewsStart(dataViews);
    setCoreStart(core);
    setUsageCollectionStart(usageCollection);
  }
}
