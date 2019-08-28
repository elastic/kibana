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
import { IFeatureCatalogueRegistryProvider } from 'ui/registry/feature_catalogue';
// @ts-ignore
import { timelionVis } from './timelion_vis_fn';
// @ts-ignore
import { TimelionVisProvider } from './vis';
// @ts-ignore
import { registerFeature } from './register_feature';
// @ts-ignore
import { timeChartProvider } from './panels/timechart/timechart';

/** @internal */
export interface TimelionPluginSetupDependencies {
  data: ReturnType<DataPublicPlugin['setup']>;
  visualizations: VisualizationsSetup;
  featureCatalogueRegistryProvider: IFeatureCatalogueRegistryProvider;
}

/** @internal */
export interface TimelionPluginStartDependencies {
  panelRegistry: any;
}

/** @internal */
export class TimelionPlugin implements Plugin<Promise<void>, void> {
  initializerContext: PluginInitializerContext;

  constructor(initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
  }

  public async setup(core: CoreSetup, plugins: TimelionPluginSetupDependencies) {
    plugins.featureCatalogueRegistryProvider.register(registerFeature);
    plugins.data.expressions.registerFunction(timelionVis);
    plugins.visualizations.types.VisTypesRegistryProvider.register(TimelionVisProvider);
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
