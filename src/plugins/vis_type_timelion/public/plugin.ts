/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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

import { getTimelionVisualizationConfig } from './timelion_vis_fn';
import { getTimelionVisDefinition } from './timelion_vis_type';
import { setIndexPatterns, setSavedObjectsClient, setDataSearch } from './helpers/plugin_services';
import { ConfigSchema } from '../config';

import { getArgValueSuggestions } from './helpers/arg_value_suggestions';
import { getTimelionVisRenderer } from './timelion_vis_renderer';

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
    core: CoreSetup,
    { expressions, visualizations, data }: TimelionVisSetupDependencies
  ) {
    const dependencies: TimelionVisDependencies = {
      uiSettings: core.uiSettings,
      http: core.http,
      timefilter: data.query.timefilter.timefilter,
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
    setSavedObjectsClient(core.savedObjects.client);
    setDataSearch(plugins.data.search);

    return {
      getArgValueSuggestions,
    };
  }
}
