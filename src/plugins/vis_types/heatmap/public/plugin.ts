/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import { CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { VisualizationsSetup } from '@kbn/visualizations-plugin/public';
import { LEGACY_HEATMAP_CHARTS_LIBRARY } from '../common';
import { HeatmapPublicConfig } from '../config';
import { setDataViewsStart } from './services';
import { heatmapVisType } from './vis_type';

/** @internal */
export interface VisTypeHeatmapSetupDependencies {
  visualizations: VisualizationsSetup;
  charts: ChartsPluginSetup;
  usageCollection: UsageCollectionSetup;
}

/** @internal */
export interface VisTypeHeatmapPluginStartDependencies {
  data: DataPublicPluginStart;
  fieldFormats: FieldFormatsStart;
}

/** @internal */
export interface VisTypeHeatmapStartDependencies {
  dataViews: DataViewsPublicPluginStart;
}

export class VisTypeHeatmapPlugin {
  private readonly initializerContext: PluginInitializerContext<HeatmapPublicConfig>;

  constructor(initializerContext: PluginInitializerContext<HeatmapPublicConfig>) {
    this.initializerContext = initializerContext;
  }

  setup(
    core: CoreSetup<VisTypeHeatmapPluginStartDependencies>,
    { visualizations, charts, usageCollection }: VisTypeHeatmapSetupDependencies
  ) {
    if (!core.uiSettings.get(LEGACY_HEATMAP_CHARTS_LIBRARY)) {
      const { readOnly } = this.initializerContext.config.get<HeatmapPublicConfig>();
      visualizations.createBaseVisualization({
        ...heatmapVisType({
          showElasticChartsOptions: true,
          palettes: charts.palettes,
        }),
        disableCreate: Boolean(readOnly),
        disableEdit: Boolean(readOnly),
      });
    }
    return {};
  }

  start(core: CoreStart, { dataViews }: VisTypeHeatmapStartDependencies) {
    setDataViewsStart(dataViews);
  }
}
