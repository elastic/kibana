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
import { CoreSetup, CoreStart } from 'src/core/public';
import { VisualizationsSetup } from '../../visualizations/public';
import { Plugin as ExpressionsPublicPlugin } from '../../expressions/public';
import { ChartsPluginSetup } from '../../charts/public';
import { DataPublicPluginStart } from '../../data/public';
import { createPieVisFn } from './pie_fn';
import { pieVisRenderer } from './pie_renderer';
import { pieVisType } from './vis_type';
import { setThemeService, setColorsService, setFormatService } from './services';

export interface VisTypePieSetupDependencies {
  visualizations: VisualizationsSetup;
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  charts: ChartsPluginSetup;
}

export interface VisTypePiePluginStartDependencies {
  data: DataPublicPluginStart;
}

export class VisTypePiePlugin {
  setup(
    core: CoreSetup<VisTypePiePluginStartDependencies>,
    { expressions, visualizations, charts }: VisTypePieSetupDependencies
  ) {
    // temporary, add it as arg to pieVisRenderer
    setThemeService(charts.theme);
    // setColorsService(charts.palettes);
    charts.palettes.getPalettes().then((palettes) => {
      setColorsService(palettes);
    });

    [createPieVisFn].forEach(expressions.registerFunction);
    expressions.registerRenderer(pieVisRenderer);
    visualizations.createBaseVisualization(pieVisType(true));
    // core.getStartServices().then(([coreStart]) => {
    //   visualizations.registerAlias(getLensAliasConfig(coreStart.docLinks));
    // });
  }

  start(core: CoreStart, { data }: VisTypePiePluginStartDependencies) {
    setFormatService(data.fieldFormats);
  }
}
