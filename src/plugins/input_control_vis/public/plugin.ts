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
import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from 'kibana/public';

import { DataPublicPluginSetup, DataPublicPluginStart } from 'src/plugins/data/public';
import { Plugin as ExpressionsPublicPlugin } from '../../expressions/public';
import { VisualizationsSetup, VisualizationsStart } from '../../visualizations/public';
import { createInputControlVisFn } from './input_control_fn';
import { createInputControlVisTypeDefinition } from './input_control_vis_type';

type InputControlVisCoreSetup = CoreSetup<InputControlVisPluginStartDependencies, void>;

export interface InputControlSettings {
  autocompleteTimeout: number;
  autocompleteTerminateAfter: number;
}

export interface InputControlVisDependencies {
  core: InputControlVisCoreSetup;
  data: DataPublicPluginSetup;
  getSettings: () => Promise<InputControlSettings>;
}

/** @internal */
export interface InputControlVisPluginSetupDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  visualizations: VisualizationsSetup;
  data: DataPublicPluginSetup;
}

/** @internal */
export interface InputControlVisPluginStartDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['start']>;
  visualizations: VisualizationsStart;
  data: DataPublicPluginStart;
}

/** @internal */
export class InputControlVisPlugin implements Plugin<void, void> {
  private cachedSettings: InputControlSettings | undefined = undefined;

  constructor(public initializerContext: PluginInitializerContext) {}

  public setup(
    core: InputControlVisCoreSetup,
    { expressions, visualizations, data }: InputControlVisPluginSetupDependencies
  ) {
    const visualizationDependencies: Readonly<InputControlVisDependencies> = {
      core,
      data,
      getSettings: async () => {
        if (!this.cachedSettings) {
          this.cachedSettings = await core.http.get<InputControlSettings>(
            '/api/input_control_vis/settings'
          );
        }

        return this.cachedSettings;
      },
    };

    expressions.registerFunction(createInputControlVisFn);
    visualizations.createBaseVisualization(
      createInputControlVisTypeDefinition(visualizationDependencies)
    );
  }

  public start(core: CoreStart, deps: InputControlVisPluginStartDependencies) {
    // nothing to do here
  }
}
