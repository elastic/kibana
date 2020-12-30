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

import { Plugin as ExpressionsPublicPlugin } from '../../expressions/public';
import { VisualizationsSetup } from '../../visualizations/public';
import { ChartsPluginSetup } from '../../charts/public';
import { DataPublicPluginStart } from '../../data/public';
import { KibanaLegacyStart } from '../../kibana_legacy/public';
import { CHARTS_LIBRARY } from '../../vis_type_xy/public';

import { createVisTypeVislibVisFn } from './vis_type_vislib_vis_fn';
import { createPieVisFn } from './pie_fn';
import {
  convertedTypeDefinitions,
  pieVisTypeDefinition,
  visLibVisTypeDefinitions,
} from './vis_type_vislib_vis_types';
import { setFormatService, setDataActions } from './services';
import { getVislibVisRenderer } from './vis_renderer';

/** @internal */
export interface VisTypeVislibPluginSetupDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  visualizations: VisualizationsSetup;
  charts: ChartsPluginSetup;
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
    { expressions, visualizations, charts }: VisTypeVislibPluginSetupDependencies
  ) {
    if (core.uiSettings.get(CHARTS_LIBRARY)) {
      // Register only non-replaced vis types
      convertedTypeDefinitions.forEach(visualizations.createBaseVisualization);
      visualizations.createBaseVisualization(pieVisTypeDefinition);
      expressions.registerRenderer(getVislibVisRenderer(core, charts));
      [createVisTypeVislibVisFn(), createPieVisFn()].forEach(expressions.registerFunction);
    } else {
      // Register all vis types
      visLibVisTypeDefinitions.forEach(visualizations.createBaseVisualization);
      visualizations.createBaseVisualization(pieVisTypeDefinition);
      expressions.registerRenderer(getVislibVisRenderer(core, charts));
      [createVisTypeVislibVisFn(), createPieVisFn()].forEach(expressions.registerFunction);
    }
  }

  public start(core: CoreStart, { data }: VisTypeVislibPluginStartDependencies) {
    setFormatService(data.fieldFormats);
    setDataActions(data.actions);
  }
}
