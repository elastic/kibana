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
  InternalCoreStart,
  Plugin,
  PluginInitializerContext,
} from 'kibana/public';
import { VisualizationsSetup } from 'src/legacy/core_plugins/visualizations/public';
import { Plugin as DataPublicPlugin } from 'src/plugins/data/public';
import { getTimelionVisualizationConfig } from './timelion_vis_fn';
import { getTimelionVisualization } from './vis';
import { timeChartProvider } from './panels/timechart/timechart';
import { LegacyDependenciesPlugin, LegacyDependenciesPluginSetup } from './shim';

/** @internal */
export interface TimelionPluginSetupDependencies {
  data: ReturnType<DataPublicPlugin['setup']>;
  visualizations: VisualizationsSetup;

  // Temporary solution
  __LEGACY: LegacyDependenciesPlugin;
}

/** @internal */
export interface TimelionPluginStartDependencies {
  panelRegistry: any;
}

/** @internal */
export class TimelionPlugin
  implements
    Plugin<Promise<void>, void, TimelionPluginSetupDependencies, TimelionPluginStartDependencies> {
  initializerContext: PluginInitializerContext;

  constructor(initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
  }

  public async setup(core: CoreSetup, plugins: TimelionPluginSetupDependencies) {
    const dependencies: LegacyDependenciesPluginSetup = await plugins.__LEGACY.setup();

    plugins.data.expressions.registerFunction(() => getTimelionVisualizationConfig(dependencies));
    plugins.visualizations.types.VisTypesRegistryProvider.register(() =>
      getTimelionVisualization(dependencies)
    );
  }

  public start(core: CoreStart & InternalCoreStart, plugins: TimelionPluginStartDependencies) {
    const timelionUiEnabled = core.injectedMetadata.getInjectedVar('timelionUiEnabled');

    if (timelionUiEnabled === false) {
      core.chrome.navLinks.update('timelion', { hidden: true });
    }

    plugins.panelRegistry.register(timeChartProvider);
  }

  public stop(): void {}
}
