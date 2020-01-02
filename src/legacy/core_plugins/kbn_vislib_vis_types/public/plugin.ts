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
import { createKbnVislibVisTypesFn } from './kbn_vislib_vis_fn';
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
  // @ts-ignore
} from './kbn_vislib_vis_types';

type ResponseHandlerProvider = () => {
  name: string;
  handler: (response: any, dimensions: any) => Promise<any>;
};
type KbnVislibVisTypesCoreSetup = CoreSetup<KbnVislibVisTypesPluginStartDependencies>;

export interface LegacyDependencies {
  initializeHierarchicalTooltipFormatter: () => Promise<void>;
  getHierarchicalTooltipFormatter: () => Promise<void>;
  initializePointSeriesTooltipFormatter: () => void;
  getPointSeriesTooltipFormatter: () => void;
  vislibSeriesResponseHandlerProvider: ResponseHandlerProvider;
  vislibSlicesResponseHandlerProvider: ResponseHandlerProvider;
  vislibColor: (colors: Array<string | number>, mappings: any) => (value: any) => any;
}

export type KbnVislibVisTypesDependencies = LegacyDependencies & {
  uiSettings: IUiSettingsClient;
};

/** @internal */
export interface KbnVislibVisTypesPluginSetupDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  visualizations: VisualizationsSetup;
  __LEGACY: LegacyDependencies;
}

/** @internal */
export interface KbnVislibVisTypesPluginStartDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['start']>;
  visualizations: VisualizationsStart;
}

/** @internal */
export class KbnVislibVisTypesPlugin implements Plugin<Promise<void>, void> {
  constructor(public initializerContext: PluginInitializerContext) {}

  public async setup(
    core: KbnVislibVisTypesCoreSetup,
    { expressions, visualizations, __LEGACY }: KbnVislibVisTypesPluginSetupDependencies
  ) {
    // @ts-ignore
    const visualizationDependencies: Readonly<KbnVislibVisTypesDependencies> = {
      ...__LEGACY,
      uiSettings: core.uiSettings,
    };

    expressions.registerFunction(createKbnVislibVisTypesFn(visualizationDependencies));
    expressions.registerFunction(createPieVisFn(visualizationDependencies));

    [
      createHistogramVisTypeDefinition,
      createLineVisTypeDefinition,
      createPieVisTypeDefinition,
      createAreaVisTypeDefinition,
      createHeatmapVisTypeDefinition,
      createHorizontalBarVisTypeDefinition,
      createGaugeVisTypeDefinition,
      createGoalVisTypeDefinition,
    ].forEach(vis => visualizations.types.createBaseVisualization(vis(visualizationDependencies)));
  }

  public start(core: CoreStart, deps: KbnVislibVisTypesPluginStartDependencies) {
    // nothing to do here
  }
}
