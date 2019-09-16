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
import { Plugin as ExpressionsPublicPlugin } from '../../../../plugins/expressions/public';
import { VisualizationsSetup } from '../../visualizations/public';

import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  UiSettingsClientContract,
} from '../../../../core/public';

import { LegacyDependenciesPluginSetup, LegacyDependenciesPlugin } from './shim';

import { createTableVisFn } from './table_vis_fn';
import { createTableVisTypeDefinition } from './table_vis_type';

/** @internal */
export interface TableVisualizationDependencies extends LegacyDependenciesPluginSetup {
  uiSettings: UiSettingsClientContract;
}

/** @internal */
export interface TablePluginSetupDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  visualizations: VisualizationsSetup;
  __LEGACY: LegacyDependenciesPlugin;
}

/** @internal */
export class TableVisPlugin implements Plugin<Promise<void>, void> {
  initializerContext: PluginInitializerContext;

  constructor(initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
  }

  public async setup(
    core: CoreSetup,
    { expressions, visualizations, __LEGACY }: TablePluginSetupDependencies
  ) {
    const visualizationDependencies: Readonly<TableVisualizationDependencies> = {
      uiSettings: core.uiSettings,
      ...(await __LEGACY.setup()),
    };

    expressions.registerFunction(createTableVisFn);

    visualizations.types.registerVisualization(() =>
      createTableVisTypeDefinition(visualizationDependencies)
    );
  }

  public start(core: CoreStart) {
    // nothing to do here yet
  }
}
