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
  ThemeServiceStart,
} from 'kibana/public';
import type { Plugin as ExpressionsPlugin } from 'src/plugins/expressions/public';
import type {
  DataPublicPluginSetup,
  DataPublicPluginStart,
  TimefilterContract,
} from 'src/plugins/data/public';
import type { DataViewsPublicPluginStart } from 'src/plugins/data_views/public';
import type { VisualizationsSetup } from 'src/plugins/visualizations/public';
import type { ChartsPluginSetup, ChartsPluginStart } from 'src/plugins/charts/public';

import { getTimelionVisualizationConfig } from './timelion_vis_fn';
import { getTimelionVisDefinition } from './timelion_vis_type';
import { setIndexPatterns, setDataSearch, setCharts } from './helpers/plugin_services';

import { getArgValueSuggestions } from './helpers/arg_value_suggestions';
import { getTimelionVisRenderer } from './timelion_vis_renderer';

import type { ConfigSchema } from '../config';

/** @internal */
export interface TimelionVisDependencies extends Partial<CoreStart> {
  uiSettings: IUiSettingsClient;
  http: HttpSetup;
  timefilter: TimefilterContract;
  theme: ThemeServiceStart;
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
  constructor(public initializerContext: PluginInitializerContext<ConfigSchema>) {}

  public setup(
    { uiSettings, http, theme }: CoreSetup,
    { expressions, visualizations, data, charts }: TimelionVisSetupDependencies
  ) {
    const dependencies: TimelionVisDependencies = {
      http,
      uiSettings,
      timefilter: data.query.timefilter.timefilter,
      theme,
    };

    expressions.registerFunction(() => getTimelionVisualizationConfig(dependencies));
    expressions.registerRenderer(getTimelionVisRenderer(dependencies));
    visualizations.createBaseVisualization(getTimelionVisDefinition(dependencies));
  }

  public start(core: CoreStart, { data, charts, dataViews }: TimelionVisStartDependencies) {
    setIndexPatterns(dataViews);
    setDataSearch(data.search);
    setCharts(charts);

    return {
      getArgValueSuggestions,
    };
  }
}
