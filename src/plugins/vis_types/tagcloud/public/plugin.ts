/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { VisualizationsSetup } from '@kbn/visualizations-plugin/public';
import { ChartsPluginSetup } from '@kbn/charts-plugin/public';

import { getTagCloudVisTypeDefinition } from './tag_cloud_type';
import { ConfigSchema } from '../config';

/** @internal */
export interface TagCloudPluginSetupDependencies {
  visualizations: VisualizationsSetup;
  charts: ChartsPluginSetup;
}

/** @internal */
export interface TagCloudVisDependencies {
  palettes: ChartsPluginSetup['palettes'];
}

/** @internal */
export class TagCloudPlugin implements Plugin<void, void> {
  initializerContext: PluginInitializerContext<ConfigSchema>;

  constructor(initializerContext: PluginInitializerContext<ConfigSchema>) {
    this.initializerContext = initializerContext;
  }

  public setup(core: CoreSetup, { visualizations, charts }: TagCloudPluginSetupDependencies) {
    const visualizationDependencies: TagCloudVisDependencies = {
      palettes: charts.palettes,
    };

    visualizations.createBaseVisualization(getTagCloudVisTypeDefinition(visualizationDependencies));
  }

  public start(core: CoreStart) {}
}
