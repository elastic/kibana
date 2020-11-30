/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
