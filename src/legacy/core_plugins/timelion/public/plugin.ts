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
  Plugin,
  PluginInitializerContext,
  IUiSettingsClient,
  CoreStart,
} from 'kibana/public';
import { getTimeChart } from './panels/timechart/timechart';
import { Panel } from './panels/panel';
import { LegacyDependenciesPlugin, LegacyDependenciesPluginSetup } from './shim';
import { KibanaLegacyStart } from '../../../../plugins/kibana_legacy/public';

/** @internal */
export interface TimelionVisualizationDependencies extends LegacyDependenciesPluginSetup {
  uiSettings: IUiSettingsClient;
  timelionPanels: Map<string, Panel>;
}

/** @internal */
export interface TimelionPluginSetupDependencies {
  // Temporary solution
  __LEGACY: LegacyDependenciesPlugin;
}

/** @internal */
export class TimelionPlugin implements Plugin<Promise<void>, void> {
  initializerContext: PluginInitializerContext;

  constructor(initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
  }

  public async setup(core: CoreSetup, { __LEGACY }: TimelionPluginSetupDependencies) {
    const timelionPanels: Map<string, Panel> = new Map();

    const dependencies: TimelionVisualizationDependencies = {
      uiSettings: core.uiSettings,
      timelionPanels,
      ...(await __LEGACY.setup(core, timelionPanels)),
    };

    this.registerPanels(dependencies);
  }

  private registerPanels(dependencies: TimelionVisualizationDependencies) {
    const timeChartPanel: Panel = getTimeChart(dependencies);

    dependencies.timelionPanels.set(timeChartPanel.name, timeChartPanel);
  }

  public start(core: CoreStart, { kibanaLegacy }: { kibanaLegacy: KibanaLegacyStart }) {
    kibanaLegacy.loadFontAwesome();
  }

  public stop(): void {}
}
