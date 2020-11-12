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

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'kibana/public';

import { VisTypeXyPluginSetup } from 'src/plugins/vis_type_xy/public';
import { Plugin as ExpressionsPublicPlugin } from '../../expressions/public';
import { BaseVisTypeOptions, VisualizationsSetup } from '../../visualizations/public';
import { createVisTypeVislibVisFn } from './vis_type_vislib_vis_fn';
import { createPieVisFn } from './pie_fn';
import { visLibVisTypeDefinitions, pieVisTypeDefinition } from './vis_type_vislib_vis_types';
import { ChartsPluginSetup } from '../../charts/public';
import { DataPublicPluginStart } from '../../data/public';
import { KibanaLegacyStart } from '../../kibana_legacy/public';
import { setFormatService, setDataActions } from './services';
import { getVislibVisRenderer } from './vis_renderer';
import { BasicVislibParams } from './types';

/** @internal */
export interface VisTypeVislibPluginSetupDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  visualizations: VisualizationsSetup;
  charts: ChartsPluginSetup;
  visTypeXy?: VisTypeXyPluginSetup;
}

/** @internal */
export interface VisTypeVislibPluginStartDependencies {
  data: DataPublicPluginStart;
  kibanaLegacy: KibanaLegacyStart;
}

export type VisTypeVislibCoreSetup = CoreSetup<VisTypeVislibPluginStartDependencies, void>;

/** @internal */
export class VisTypeVislibPlugin
  implements
    Plugin<void, void, VisTypeVislibPluginSetupDependencies, VisTypeVislibPluginStartDependencies> {
  constructor(public initializerContext: PluginInitializerContext) {}

  public async setup(
    core: VisTypeVislibCoreSetup,
    { expressions, visualizations, charts, visTypeXy }: VisTypeVislibPluginSetupDependencies
  ) {
    // if visTypeXy plugin is disabled it's config will be undefined
    if (!visTypeXy) {
      const convertedTypes: Array<BaseVisTypeOptions<BasicVislibParams>> = [];
      const convertedFns: any[] = [];

      // Register legacy vislib types that have been converted
      convertedFns.forEach(expressions.registerFunction);
      convertedTypes.forEach(visualizations.createBaseVisualization);
      expressions.registerRenderer(getVislibVisRenderer(core, charts));
    }
    // Register non-converted types
    visLibVisTypeDefinitions.forEach(visualizations.createBaseVisualization);
    // visualizations.createBaseVisualization(pieVisTypeDefinition);
    expressions.registerRenderer(getVislibVisRenderer(core, charts));
    // [createVisTypeVislibVisFn(), createPieVisFn()].forEach(expressions.registerFunction);
    [createVisTypeVislibVisFn()].forEach(expressions.registerFunction);
  }

  public start(core: CoreStart, { data }: VisTypeVislibPluginStartDependencies) {
    setFormatService(data.fieldFormats);
    setDataActions(data.actions);
  }
}
