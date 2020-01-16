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
import { DataPublicPluginSetup, TimefilterContract } from 'src/plugins/data/public';

import { PluginsStart } from './legacy_imports';
import { VisualizationsSetup } from '../../visualizations/public/np_ready/public';

import { getTimelionVisualizationConfig } from './timelion_vis_fn';
import { getTimelionVisDefinition } from './timelion_vis_type';
import { setIndexPatterns, setSavedObjectsClient } from './helpers/plugin_services';

type TimelionVisCoreSetup = CoreSetup<TimelionVisSetupDependencies>;

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
export class TimelionVisPlugin implements Plugin<void, void> {
  constructor(public initializerContext: PluginInitializerContext) {}

  public async setup(
    core: TimelionVisCoreSetup,
    { expressions, visualizations, data }: TimelionVisSetupDependencies
  ) {
    const dependencies: TimelionVisDependencies = {
      uiSettings: core.uiSettings,
      http: core.http,
      timefilter: data.query.timefilter.timefilter,
    };

    expressions.registerFunction(() => getTimelionVisualizationConfig(dependencies));
    visualizations.types.createReactVisualization(getTimelionVisDefinition(dependencies));
  }

  public start(core: CoreStart, plugins: PluginsStart) {
    setIndexPatterns(plugins.data.indexPatterns);
    setSavedObjectsClient(core.savedObjects.client);
  }
}
