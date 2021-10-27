/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, DocLinksStart, IUiSettingsClient } from 'src/core/public';
import { VisualizationsSetup } from '../../../visualizations/public';
import { Plugin as ExpressionsPublicPlugin } from '../../../expressions/public';
import { ChartsPluginSetup } from '../../../charts/public';
import { UsageCollectionSetup } from '../../../usage_collection/public';
import { DataPublicPluginStart } from '../../../data/public';
import { LEGACY_HEATMAP_CHARTS_LIBRARY } from '../common';
import { createHeatmapVisFn } from './heatmap_fn';
import { getHeatmapVisRenderer } from './heatmap_renderer';
import { heatmapVisType } from './vis_type';

/** @internal */
export interface VisTypeHeatmapSetupDependencies {
  visualizations: VisualizationsSetup;
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  charts: ChartsPluginSetup;
  usageCollection: UsageCollectionSetup;
}

/** @internal */
export interface VisTypeHeatmapPluginStartDependencies {
  data: DataPublicPluginStart;
}

/** @internal */
export interface VisTypeHeatmapDependencies {
  theme: ChartsPluginSetup['theme'];
  palettes: ChartsPluginSetup['palettes'];
  getStartDeps: () => Promise<{
    data: DataPublicPluginStart;
    docLinks: DocLinksStart;
    uiSettings: IUiSettingsClient;
  }>;
}

export class VisTypePiePlugin {
  setup(
    core: CoreSetup<VisTypeHeatmapPluginStartDependencies>,
    { expressions, visualizations, charts, usageCollection }: VisTypeHeatmapSetupDependencies
  ) {
    if (!core.uiSettings.get(LEGACY_HEATMAP_CHARTS_LIBRARY, false)) {
      const getStartDeps = async () => {
        const [coreStart, deps] = await core.getStartServices();
        return {
          data: deps.data,
          docLinks: coreStart.docLinks,
          uiSettings: coreStart.uiSettings,
        };
      };
      const trackUiMetric = usageCollection?.reportUiCounter.bind(
        usageCollection,
        'vis_type_heatmap'
      );

      expressions.registerFunction(createHeatmapVisFn);
      expressions.registerRenderer(
        getHeatmapVisRenderer({ theme: charts.theme, palettes: charts.palettes, getStartDeps })
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
