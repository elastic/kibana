/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  IUiSettingsClient,
  HttpSetup,
} from '@kbn/core/public';
import type { Plugin as ExpressionsPlugin } from '@kbn/expressions-plugin/public';
import type {
  DataPublicPluginSetup,
  DataPublicPluginStart,
  TimefilterContract,
} from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { VisualizationsSetup } from '@kbn/visualizations-plugin/public';
import type { ChartsPluginSetup, ChartsPluginStart } from '@kbn/charts-plugin/public';

import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { getTimelionVisualizationConfig } from './timelion_vis_fn';
import { getTimelionVisDefinition } from './timelion_vis_type';
import {
  setIndexPatterns,
  setDataSearch,
  setCharts,
  setCoreStart,
  setFieldFormats,
  setUsageCollection,
} from './helpers/plugin_services';

import { getArgValueSuggestions } from './helpers/arg_value_suggestions';
import { getTimelionVisRenderer } from './timelion_vis_renderer';

import type { TimelionPublicConfig } from '../server/config';

/** @internal */
export interface TimelionVisDependencies extends Partial<CoreStart> {
  uiSettings: IUiSettingsClient;
  http: HttpSetup;
  timefilter: TimefilterContract;
}

/** @internal */
export interface TimelionVisSetupDependencies {
  expressions: ReturnType<ExpressionsPlugin['setup']>;
  visualizations: VisualizationsSetup;
  data: DataPublicPluginSetup;
  charts: ChartsPluginSetup;
}

/** @internal */
export interface TimelionVisStartDependencies {
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  charts: ChartsPluginStart;
  fieldFormats: FieldFormatsStart;
  usageCollection?: UsageCollectionStart;
}

/** @public */
export interface VisTypeTimelionPluginStart {
  getArgValueSuggestions: typeof getArgValueSuggestions;
}

/** @internal */
export class TimelionVisPlugin
  implements
    Plugin<
      void,
      VisTypeTimelionPluginStart,
      TimelionVisSetupDependencies,
      TimelionVisStartDependencies
    >
{
  constructor(public initializerContext: PluginInitializerContext<TimelionPublicConfig>) {}

  public setup(
    { uiSettings, http }: CoreSetup,
    { expressions, visualizations, data, charts }: TimelionVisSetupDependencies
  ) {
    const dependencies: TimelionVisDependencies = {
      http,
      uiSettings,
      timefilter: data.query.timefilter.timefilter,
    };

    expressions.registerFunction(() => getTimelionVisualizationConfig(dependencies));
    expressions.registerRenderer(getTimelionVisRenderer(dependencies));
    const { readOnly } = this.initializerContext.config.get<TimelionPublicConfig>();
    visualizations.createBaseVisualization({
      ...getTimelionVisDefinition(dependencies),
      disableCreate: Boolean(readOnly),
      disableEdit: Boolean(readOnly),
    });
  }

  public start(
    core: CoreStart,
    { data, charts, dataViews, fieldFormats, usageCollection }: TimelionVisStartDependencies
  ) {
    setCoreStart(core);
    setIndexPatterns(dataViews);
    setDataSearch(data.search);
    setCharts(charts);
    setFieldFormats(fieldFormats);

    if (usageCollection) {
      setUsageCollection(usageCollection);
    }

    return {
      getArgValueSuggestions,
    };
  }
}
