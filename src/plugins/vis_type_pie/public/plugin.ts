/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CoreSetup, CoreStart, DocLinksStart } from 'src/core/public';
import { VisualizationsSetup } from '../../visualizations/public';
import { Plugin as ExpressionsPublicPlugin } from '../../expressions/public';
import { ChartsPluginSetup } from '../../charts/public';
import { UsageCollectionSetup } from '../../usage_collection/public';
import { DataPublicPluginStart } from '../../data/public';
import { LEGACY_CHARTS_LIBRARY } from '../common';
import { createPieVisFn } from './pie_fn';
import { getPieVisRenderer } from './pie_renderer';
import { pieVisType } from './vis_type';

/** @internal */
export interface VisTypePieSetupDependencies {
  visualizations: VisualizationsSetup;
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
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
  getStartDeps: () => Promise<{ data: DataPublicPluginStart; docLinks: DocLinksStart }>;
}

export class VisTypePiePlugin {
  setup(
    core: CoreSetup<VisTypePiePluginStartDependencies>,
    { expressions, visualizations, charts, usageCollection }: VisTypePieSetupDependencies
  ) {
    if (!core.uiSettings.get(LEGACY_CHARTS_LIBRARY, false)) {
      const getStartDeps = async () => {
        const [coreStart, deps] = await core.getStartServices();
        return {
          data: deps.data,
          docLinks: coreStart.docLinks,
        };
      };
      const trackUiMetric = usageCollection?.reportUiCounter.bind(usageCollection, 'vis_type_pie');

      [createPieVisFn].forEach(expressions.registerFunction);
      expressions.registerRenderer(
        getPieVisRenderer({ theme: charts.theme, palettes: charts.palettes, getStartDeps })
      );
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

  start(core: CoreStart, { data }: VisTypePiePluginStartDependencies) {}
}
