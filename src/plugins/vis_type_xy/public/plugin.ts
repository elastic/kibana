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

import { CoreSetup, CoreStart, Plugin } from '../../../core/public';
import { Plugin as ExpressionsPublicPlugin } from '../../expressions/public';
import { VisualizationsSetup, VisualizationsStart } from '../../visualizations/public';
import { ChartsPluginSetup } from '../../charts/public';
import { DataPublicPluginStart } from '../../data/public';

import { createVisTypeXyVisFn } from './xy_vis_fn';
import {
  setDataActions,
  setFormatService,
  setThemeService,
  setColorsService,
  setTimefilter,
  setUISettings,
  setDocLinks,
} from './services';
import { visTypesDefinitions } from './vis_types';
import { CHARTS_LIBRARY } from '../common';
import { xyVisRenderer } from './vis_renderer';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface VisTypeXyPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface VisTypeXyPluginStart {}

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
  data: DataPublicPluginStart;
}

type VisTypeXyCoreSetup = CoreSetup<VisTypeXyPluginStartDependencies, VisTypeXyPluginStart>;

/** @internal */
export class VisTypeXyPlugin
  implements
    Plugin<
      VisTypeXyPluginSetup,
      VisTypeXyPluginStart,
      VisTypeXyPluginSetupDependencies,
      VisTypeXyPluginStartDependencies
    > {
  public async setup(
    core: VisTypeXyCoreSetup,
    { expressions, visualizations, charts }: VisTypeXyPluginSetupDependencies
  ) {
    if (core.uiSettings.get(CHARTS_LIBRARY, false)) {
      setUISettings(core.uiSettings);
      setThemeService(charts.theme);
      setColorsService(charts.legacyColors);

      [createVisTypeXyVisFn].forEach(expressions.registerFunction);
      expressions.registerRenderer(xyVisRenderer);
      visTypesDefinitions.forEach(visualizations.createBaseVisualization);
    }

    return {};
  }

  public start(core: CoreStart, { data }: VisTypeXyPluginStartDependencies) {
    setFormatService(data.fieldFormats);
    setDataActions(data.actions);
    setTimefilter(data.query.timefilter.timefilter);
    setDocLinks(core.docLinks);

    return {};
  }
}
