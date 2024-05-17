/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { VisualizationsSetup } from '@kbn/visualizations-plugin/public';
import { TagcloudPublicConfig } from '../config';
import { setDataViewsStart } from './services';
import { getTagCloudVisTypeDefinition } from './tag_cloud_type';

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
