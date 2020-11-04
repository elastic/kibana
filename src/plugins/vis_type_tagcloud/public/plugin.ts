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
import { Plugin as ExpressionsPublicPlugin } from '../../expressions/public';
import { VisualizationsSetup } from '../../visualizations/public';
import { ChartsPluginSetup } from '../../charts/public';

import { createTagCloudFn } from './tag_cloud_fn';
import { tagCloudVisTypeDefinition } from './tag_cloud_type';
import { DataPublicPluginStart } from '../../data/public';
import { setFormatService } from './services';
import { ConfigSchema } from '../config';
import { getTagCloudVisRenderer } from './tag_cloud_vis_renderer';

/** @internal */
export interface TagCloudPluginSetupDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  visualizations: VisualizationsSetup;
  charts: ChartsPluginSetup;
}

/** @internal */
export interface TagCloudVisDependencies {
  colors: ChartsPluginSetup['legacyColors'];
}

/** @internal */
export interface TagCloudVisPluginStartDependencies {
  data: DataPublicPluginStart;
}

/** @internal */
export class TagCloudPlugin implements Plugin<void, void> {
  initializerContext: PluginInitializerContext<ConfigSchema>;

  constructor(initializerContext: PluginInitializerContext<ConfigSchema>) {
    this.initializerContext = initializerContext;
  }

  public setup(
    core: CoreSetup,
    { expressions, visualizations, charts }: TagCloudPluginSetupDependencies
  ) {
    const visualizationDependencies: TagCloudVisDependencies = {
      colors: charts.legacyColors,
    };
    expressions.registerFunction(createTagCloudFn);
    expressions.registerRenderer(getTagCloudVisRenderer(visualizationDependencies));
    visualizations.createBaseVisualization(tagCloudVisTypeDefinition);
  }

  public start(core: CoreStart, { data }: TagCloudVisPluginStartDependencies) {
    setFormatService(data.fieldFormats);
  }
}
