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
import { VisualizationsSetup } from '../../visualizations/public/np_ready/public';
import { getTimeChart } from './panels/timechart/timechart';
import { Panel } from './panels/panel';
import { setServices } from './kibana_services';

import { getTimelionVisualizationConfig } from './timelion_vis_fn';
import { getTimelionVisDefinition } from './timelion_vis_type';

/** @internal */
export interface TimelionVisualizationDependencies {
  uiSettings: IUiSettingsClient;
  http: HttpSetup;
  timelionPanels: Map<string, any>;
  timefilter: TimefilterContract;
}

/** @internal */
export interface TimelionPluginSetupDependencies {
  expressions: ReturnType<ExpressionsPlugin['setup']>;
  visualizations: VisualizationsSetup;
  data: DataPublicPluginSetup;
}

/** @internal */
export class TimelionVisPlugin implements Plugin<void, void> {
  initializerContext: PluginInitializerContext;

  constructor(initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
  }

  public async setup(
    core: CoreSetup,
    { expressions, visualizations, data }: TimelionPluginSetupDependencies
  ) {
    const timelionPanels: Map<string, any> = new Map();

    const dependencies: TimelionVisualizationDependencies = {
      uiSettings: core.uiSettings,
      http: core.http,
      timelionPanels,
      timefilter: data.query.timefilter.timefilter,
    };
    setServices(dependencies);

    this.registerPanels(dependencies);

    expressions.registerFunction(() => getTimelionVisualizationConfig(dependencies));
    visualizations.types.createReactVisualization(getTimelionVisDefinition(dependencies));
  }

  private registerPanels(dependencies: TimelionVisualizationDependencies) {
    const [name, timeChartPanel] = getTimeChart(dependencies);

    dependencies.timelionPanels.set(name as string, timeChartPanel);
  }

  public start(core: CoreStart) {
    const timelionUiEnabled = core.injectedMetadata.getInjectedVar('timelionUiEnabled');

    if (timelionUiEnabled === false) {
      core.chrome.navLinks.update('timelion', { hidden: true });
    }
  }
}
