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
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { getTagCloudVisTypeDefinition } from './tag_cloud_type';
import type { TagcloudPublicConfig } from '../server/config';
import { setDataViewsStart } from './services';

/** @internal */
export interface TagCloudPluginSetupDependencies {
  visualizations: VisualizationsSetup;
  charts: ChartsPluginSetup;
}

export interface TagCloudPluginStartDependencies {
  dataViews: DataViewsPublicPluginStart;
}

/** @internal */
export interface TagCloudVisDependencies {
  palettes: ChartsPluginSetup['palettes'];
}

/** @internal */
export class TagCloudPlugin
  implements Plugin<void, void, TagCloudPluginSetupDependencies, TagCloudPluginStartDependencies>
{
  initializerContext: PluginInitializerContext<TagcloudPublicConfig>;

  constructor(initializerContext: PluginInitializerContext<TagcloudPublicConfig>) {
    this.initializerContext = initializerContext;
  }

  public setup(core: CoreSetup, { visualizations, charts }: TagCloudPluginSetupDependencies) {
    const visualizationDependencies: TagCloudVisDependencies = {
      palettes: charts.palettes,
    };

    const { readOnly } = this.initializerContext.config.get<TagcloudPublicConfig>();
    visualizations.createBaseVisualization({
      ...getTagCloudVisTypeDefinition(visualizationDependencies),
      disableCreate: Boolean(readOnly),
      disableEdit: Boolean(readOnly),
    });
  }

  public start(core: CoreStart, { dataViews }: TagCloudPluginStartDependencies) {
    setDataViewsStart(dataViews);
  }
}
