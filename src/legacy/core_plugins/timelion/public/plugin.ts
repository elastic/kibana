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
  LegacyCoreStart,
  Plugin,
  PluginInitializerContext,
  UiSettingsClientContract,
  HttpSetup,
} from 'kibana/public';
import { Plugin as ExpressionsPlugin } from 'src/plugins/expressions/public';
import { VisualizationsSetup } from '../../visualizations/public/np_ready';
import { getTimelionVisualizationConfig } from './timelion_vis_fn';
import { getTimelionVisualization } from './vis';
import { getTimeChart } from './panels/timechart/timechart';
import {
  LegacyDependenciesPlugin,
  LegacyDependenciesPluginSetup,
  LegacyDependenciesPluginStart,
} from './shim';

/** @internal */
export interface TimelionPluginSetupDependencies {
  expressions: ReturnType<ExpressionsPlugin['setup']>;
  visualizations: VisualizationsSetup;

  // Temporary solution
  __LEGACY: LegacyDependenciesPlugin;
}

/** @internal */
export interface TimelionPluginStartDependencies {
  panelRegistry: any;

  // Temporary solution
  __LEGACY: LegacyDependenciesPlugin;
}

interface TimelionVisualizationDependencies {
  uiSettings: UiSettingsClientContract;
  http?: HttpSetup;
}

/** @internal */
export type TimelionSetupDependencies = TimelionVisualizationDependencies &
  LegacyDependenciesPluginSetup;

/** @internal */
export type TimelionStartDependencies = Pick<TimelionVisualizationDependencies, 'uiSettings'> &
  LegacyDependenciesPluginStart;

/** @internal */
export class TimelionPlugin
  implements
    Plugin<Promise<void>, void, TimelionPluginSetupDependencies, TimelionPluginStartDependencies> {
  initializerContext: PluginInitializerContext;

  constructor(initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
  }

  public async setup(core: CoreSetup, plugins: TimelionPluginSetupDependencies) {
    const dependencies: TimelionSetupDependencies = {
      uiSettings: core.uiSettings,
      http: core.http,
      ...(await plugins.__LEGACY.setup()),
    };

    plugins.expressions.registerFunction(() => getTimelionVisualizationConfig(dependencies));
    plugins.visualizations.types.registerVisualization(() =>
      getTimelionVisualization(dependencies)
    );
  }

  public async start(core: CoreStart & LegacyCoreStart, plugins: TimelionPluginStartDependencies) {
    const dependencies: TimelionStartDependencies = {
      uiSettings: core.uiSettings,
      ...(await plugins.__LEGACY.start()),
    };
    const timelionUiEnabled = core.injectedMetadata.getInjectedVar('timelionUiEnabled');

    if (timelionUiEnabled === false) {
      core.chrome.navLinks.update('timelion', { hidden: true });
    }

    plugins.panelRegistry.register(() => getTimeChart(dependencies));
  }

  public stop(): void {}
}
