/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup } from '@kbn/core/public';
import type { VisualizationsSetup } from '@kbn/visualizations-plugin/public';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { LEGACY_HEATMAP_CHARTS_LIBRARY } from '../common';
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

export class VisTypeHeatmapPlugin {
  setup(
    core: CoreSetup<VisTypeHeatmapPluginStartDependencies>,
    { visualizations, charts, usageCollection }: VisTypeHeatmapSetupDependencies
  ) {
    if (!core.uiSettings.get(LEGACY_HEATMAP_CHARTS_LIBRARY)) {
      const trackUiMetric = usageCollection?.reportUiCounter.bind(
        usageCollection,
        'vis_type_heatmap'
      );

      visualizations.createBaseVisualization(
        heatmapVisType({
          showElasticChartsOptions: true,
          palettes: charts.palettes,
          trackUiMetric,
        })
      );
    }
    return {};
  }

  start() {}
}
