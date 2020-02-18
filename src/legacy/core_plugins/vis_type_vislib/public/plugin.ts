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

import { Plugin as ExpressionsPublicPlugin } from '../../../../plugins/expressions/public';
import { VisualizationsSetup, VisualizationsStart } from '../../visualizations/public';
import { createVisTypeVislibVisFn } from './vis_type_vislib_vis_fn';
import { createPieVisFn } from './pie_fn';
import {
  createHistogramVisTypeDefinition,
  createLineVisTypeDefinition,
  createPieVisTypeDefinition,
  createAreaVisTypeDefinition,
  createHeatmapVisTypeDefinition,
  createHorizontalBarVisTypeDefinition,
  createGaugeVisTypeDefinition,
  createGoalVisTypeDefinition,
} from './vis_type_vislib_vis_types';
import { ChartsPluginSetup } from '../../../../plugins/charts/public';
import { ConfigSchema as VisTypeXyConfigSchema } from '../../vis_type_xy';

export interface VisTypeVislibDependencies {
  uiSettings: IUiSettingsClient;
  charts: ChartsPluginSetup;
}

/** @internal */
export interface VisTypeVislibPluginSetupDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  visualizations: VisualizationsSetup;
  charts: ChartsPluginSetup;
}

/** @internal */
export interface VisTypeVislibPluginStartDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['start']>;
  visualizations: VisualizationsStart;
}

type VisTypeVislibCoreSetup = CoreSetup<VisTypeVislibPluginStartDependencies>;

/** @internal */
export class VisTypeVislibPlugin implements Plugin<Promise<void>, void> {
  constructor(public initializerContext: PluginInitializerContext) {}

  public async setup(
    core: VisTypeVislibCoreSetup,
    { expressions, visualizations, charts }: VisTypeVislibPluginSetupDependencies
  ) {
    const visualizationDependencies: Readonly<VisTypeVislibDependencies> = {
      uiSettings: core.uiSettings,
      charts,
    };
    const vislibTypes = [
      createHistogramVisTypeDefinition,
      createLineVisTypeDefinition,
      createPieVisTypeDefinition,
      createAreaVisTypeDefinition,
      createHeatmapVisTypeDefinition,
      createHorizontalBarVisTypeDefinition,
      createGaugeVisTypeDefinition,
      createGoalVisTypeDefinition,
    ];
    const vislibFns = [createVisTypeVislibVisFn(), createPieVisFn()];

    const visTypeXy = core.injectedMetadata.getInjectedVar('visTypeXy') as
      | VisTypeXyConfigSchema['visTypeXy']
      | undefined;

    // if visTypeXy plugin is disabled it's config will be undefined
    if (!visTypeXy || !visTypeXy.enabled) {
      const convertedTypes: any[] = [];
      const convertedFns: any[] = [];

      // Register legacy vislib types that have been converted
      convertedFns.forEach(expressions.registerFunction);
      convertedTypes.forEach(vis =>
        visualizations.types.createBaseVisualization(vis(visualizationDependencies))
      );
    }

    // Register non-converted types
    vislibFns.forEach(expressions.registerFunction);
    vislibTypes.forEach(vis =>
      visualizations.types.createBaseVisualization(vis(visualizationDependencies))
    );
  }

  public start(core: CoreStart, deps: VisTypeVislibPluginStartDependencies) {
    // nothing to do here
  }
}
