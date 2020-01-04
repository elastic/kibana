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
import { PluginsStart } from 'ui/new_platform/new_platform';
import { Plugin as ExpressionsPlugin } from 'src/plugins/expressions/public';
import { DataPublicPluginSetup, TimefilterContract } from 'src/plugins/data/public';
import { VisualizationsSetup } from '../../visualizations/public/np_ready/public';
import { getTimeChart, IPanelWrapper } from './timechart';
import { setServices } from './kibana_services';

import { getTimelionVisualizationConfig } from './timelion_vis_fn';
import { getTimelionVisDefinition } from './timelion_vis_type';
import { setIndexPatterns, setSavedObjectsClient } from './helpers/plugin_services';

type TimelionVisCoreSetup = CoreSetup<TimelionVisSetupDependencies>;

/** @internal */
export interface TimelionVisDependencies {
  uiSettings: IUiSettingsClient;
  http: HttpSetup;
  timelionPanels: Map<string, IPanelWrapper>;
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
    const timelionPanels: Map<string, IPanelWrapper> = new Map();

    const dependencies: TimelionVisDependencies = {
      uiSettings: core.uiSettings,
      http: core.http,
      timelionPanels,
      timefilter: data.query.timefilter.timefilter,
    };
    setServices(dependencies);

    this.registerPanels(timelionPanels);

    expressions.registerFunction(getTimelionVisualizationConfig);
    visualizations.types.createReactVisualization(getTimelionVisDefinition(dependencies));
  }

  private registerPanels(timelionPanels: Map<string, IPanelWrapper>) {
    const [name, timeChartPanel] = getTimeChart();

    timelionPanels.set(name, timeChartPanel);
  }

  public start(core: CoreStart, plugins: PluginsStart) {
    setIndexPatterns(plugins.data.indexPatterns);
    setSavedObjectsClient(core.savedObjects.client);
  }
}
