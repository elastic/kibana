/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, DocLinksStart, ThemeServiceStart } from 'src/core/public';
import { VisualizationsSetup } from '../../../visualizations/public';
import { ChartsPluginSetup } from '../../../charts/public';
import { UsageCollectionSetup } from '../../../usage_collection/public';
import { DataPublicPluginStart } from '../../../data/public';
import { LEGACY_PIE_CHARTS_LIBRARY } from '../common';
import { pieVisType } from './vis_type';

/** @internal */
export interface VisTypePieSetupDependencies {
  visualizations: VisualizationsSetup;
  charts: ChartsPluginSetup;
  usageCollection: UsageCollectionSetup;
}

/** @internal */
export interface VisTypePiePluginStartDependencies {
  data: DataPublicPluginStart;
}

/** @internal */
export interface VisTypePieDependencies {
  theme: ChartsPluginSetup['theme'];
  palettes: ChartsPluginSetup['palettes'];
  getStartDeps: () => Promise<{
    data: DataPublicPluginStart;
    docLinks: DocLinksStart;
    kibanaTheme: ThemeServiceStart;
  }>;
}

export class VisTypePiePlugin {
  setup(
    core: CoreSetup<VisTypePiePluginStartDependencies>,
    { visualizations, charts, usageCollection }: VisTypePieSetupDependencies
  ) {
    if (!core.uiSettings.get(LEGACY_PIE_CHARTS_LIBRARY, false)) {
      const trackUiMetric = usageCollection?.reportUiCounter.bind(usageCollection, 'vis_type_pie');
      visualizations.createBaseVisualization(
        pieVisType({
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
