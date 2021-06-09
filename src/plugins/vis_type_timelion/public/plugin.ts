/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  IUiSettingsClient,
  HttpSetup,
} from 'kibana/public';
import { Plugin as ExpressionsPlugin } from 'src/plugins/expressions/public';
import {
  DataPublicPluginSetup,
  DataPublicPluginStart,
  TimefilterContract,
} from 'src/plugins/data/public';

import { VisualizationsSetup } from '../../visualizations/public';
import { ChartsPluginSetup } from '../../charts/public';

import { getTimelionVisualizationConfig } from './timelion_vis_fn';
import { getTimelionVisDefinition } from './timelion_vis_type';
import { setIndexPatterns, setDataSearch } from './helpers/plugin_services';
import { ConfigSchema } from '../config';

import { getArgValueSuggestions } from './helpers/arg_value_suggestions';
import { getTimelionVisRenderer } from './timelion_vis_renderer';

/** @internal */
export interface TimelionVisDependencies extends Partial<CoreStart> {
  uiSettings: IUiSettingsClient;
  http: HttpSetup;
  timefilter: TimefilterContract;
  chartTheme: ChartsPluginSetup['theme'];
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
}

/** @public */
export interface VisTypeTimelionPluginStart {
  getArgValueSuggestions: typeof getArgValueSuggestions;
}

/** @public */
export interface VisTypeTimelionPluginSetup {
  isUiEnabled: boolean;
}

/** @internal */
export class TimelionVisPlugin
  implements
    Plugin<
      VisTypeTimelionPluginSetup,
      VisTypeTimelionPluginStart,
      TimelionVisSetupDependencies,
      TimelionVisStartDependencies
    > {
  constructor(public initializerContext: PluginInitializerContext<ConfigSchema>) {}

  public setup(
    { uiSettings, http }: CoreSetup,
    { expressions, visualizations, data, charts }: TimelionVisSetupDependencies
  ) {
    const dependencies: TimelionVisDependencies = {
      http,
      uiSettings,
      timefilter: data.query.timefilter.timefilter,
      chartTheme: charts.theme,
    };

    expressions.registerFunction(() => getTimelionVisualizationConfig(dependencies));
    expressions.registerRenderer(getTimelionVisRenderer(dependencies));
    visualizations.createBaseVisualization(getTimelionVisDefinition(dependencies));

    return {
      isUiEnabled: this.initializerContext.config.get().ui.enabled,
    };
  }

  public start(core: CoreStart, plugins: TimelionVisStartDependencies) {
    setIndexPatterns(plugins.data.indexPatterns);
    setDataSearch(plugins.data.search);

    return {
      getArgValueSuggestions,
    };
  }
}
