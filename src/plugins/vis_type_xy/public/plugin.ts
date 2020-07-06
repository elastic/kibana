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
  IUiSettingsClient,
  PluginInitializerContext,
} from 'kibana/public';

import { Plugin as ExpressionsPublicPlugin } from '../../expressions/public';
import { VisualizationsSetup, VisualizationsStart } from '../../visualizations/public';
import { ChartsPluginSetup } from '../../charts/public';

export interface VisTypeXyDependencies {
  uiSettings: IUiSettingsClient;
  charts: ChartsPluginSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface VisTypeXyPluginSetup {}

/** @internal */
export interface VisTypeXyPluginSetupDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  visualizations: VisualizationsSetup;
  charts: ChartsPluginSetup;
}

/** @internal */
export interface VisTypeXyPluginStartDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['start']>;
  visualizations: VisualizationsStart;
}

type VisTypeXyCoreSetup = CoreSetup<VisTypeXyPluginStartDependencies, void>;

/** @internal */
export class VisTypeXyPlugin implements Plugin<VisTypeXyPluginSetup, void> {
  constructor(public initializerContext: PluginInitializerContext) {}

  public async setup(
    core: VisTypeXyCoreSetup,
    { expressions, visualizations, charts }: VisTypeXyPluginSetupDependencies
  ) {
    // eslint-disable-next-line no-console
    console.warn(
      'The visTypeXy plugin is enabled\n\n',
      'This may negatively alter existing vislib visualization configurations if saved.'
    );
    const visualizationDependencies: Readonly<VisTypeXyDependencies> = {
      uiSettings: core.uiSettings,
      charts,
    };

    const visTypeDefinitions: any[] = [];
    const visFunctions: any = [];

    visFunctions.forEach((fn: any) => expressions.registerFunction(fn));
    visTypeDefinitions.forEach((vis: any) =>
      visualizations.createBaseVisualization(vis(visualizationDependencies))
    );

    return {};
  }

  public start(core: CoreStart, deps: VisTypeXyPluginStartDependencies) {
    // nothing to do here
  }
}
