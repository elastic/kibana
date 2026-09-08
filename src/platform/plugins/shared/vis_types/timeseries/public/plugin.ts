/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { Plugin as ExpressionsPublicPlugin } from '@kbn/expressions-plugin/public';
import type { VisualizationsSetup } from '@kbn/visualizations-plugin/public';
import type { DataPublicPluginStart, TimefilterContract } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { HttpSetup } from '@kbn/core-http-browser';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { KqlPluginStart } from '@kbn/kql/public';
import { ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { VisTypeTimeseriesPublicConfig } from '../server/config';

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
  setKqlStart,
} from './services';
import { getTimeseriesVisRenderer } from './timeseries_vis_renderer';
import { CREATE_TSVB_PANEL } from './add_tsvb_panel_action';

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
  kql: KqlPluginStart;
  uiActions: UiActionsStart;
  embeddable: EmbeddableStart;
}

/** @internal */
export interface TimeseriesVisDependencies extends Partial<CoreStart> {
  uiSettings: IUiSettingsClient;
  http: HttpSetup;
  timefilter: TimefilterContract;
  appName: string;
  kql: KqlPluginStart;
  notifications: CoreStart['notifications'];
  storage: IStorageWrapper;
  data: DataPublicPluginStart;
  usageCollection?: UsageCollectionStart;
  docLinks: DocLinksStart;
}

/** @internal */
export class MetricsPlugin implements Plugin<void, void> {
  initializerContext: PluginInitializerContext<VisTypeTimeseriesPublicConfig>;

  constructor(initializerContext: PluginInitializerContext<VisTypeTimeseriesPublicConfig>) {
    this.initializerContext = initializerContext;
  }

  public setup(core: CoreSetup, { expressions, visualizations }: MetricsPluginSetupDependencies) {
    const { readOnly } = this.initializerContext.config.get<VisTypeTimeseriesPublicConfig>();

    visualizations.visEditorsRegistry.register(TSVB_EDITOR_NAME, EditorController);
    expressions.registerFunction(createMetricsFn);
    expressions.registerRenderer(
      getTimeseriesVisRenderer({
        uiSettings: core.uiSettings,
        core,
      })
    );
    setUISettings(core.uiSettings);
    visualizations.createBaseVisualization({
      ...metricsVisDefinition,
      disableCreate: Boolean(readOnly),
      disableEdit: Boolean(readOnly),
    });
  }

  public start(
    core: CoreStart,
    {
      data,
      charts,
      dataViews,
      usageCollection,
      fieldFormats,
      kql,
      uiActions,
      embeddable,
    }: MetricsPluginStartDependencies
  ) {
    setCharts(charts);
    setI18n(core.i18n);
    setFieldFormats(fieldFormats);
    setDataStart(data);
    setKqlStart(kql);
    setDataViewsStart(dataViews);
    setCoreStart(core);
    setUsageCollectionStart(usageCollection);

    uiActions.registerActionAsync(CREATE_TSVB_PANEL, async () => {
      const { addTSVBPanelAction } = await import('./add_tsvb_panel_action');
      return addTSVBPanelAction({ data, embeddable });
    });
    uiActions.attachAction(ADD_PANEL_TRIGGER, CREATE_TSVB_PANEL);
  }
}
