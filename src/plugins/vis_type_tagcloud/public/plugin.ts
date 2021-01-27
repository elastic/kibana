/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
