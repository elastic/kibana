/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, DocLinksStart } from 'src/core/public';
import { VisualizationsSetup } from '../../../visualizations/public';
import { Plugin as ExpressionsPublicPlugin } from '../../../expressions/public';
import { ChartsPluginSetup } from '../../../charts/public';
import { UsageCollectionSetup } from '../../../usage_collection/public';
import { DataPublicPluginStart } from '../../../data/public';
import { LEGACY_PIE_CHARTS_LIBRARY } from '../common';
import { pieLabels as pieLabelsExpressionFunction } from './expression_functions/pie_labels';
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
    if (!core.uiSettings.get(LEGACY_PIE_CHARTS_LIBRARY, false)) {
      const getStartDeps = async () => {
        const [coreStart, deps] = await core.getStartServices();
        return {
          data: deps.data,
          docLinks: coreStart.docLinks,
        };
      };
      const trackUiMetric = usageCollection?.reportUiCounter.bind(usageCollection, 'vis_type_pie');

      expressions.registerFunction(createPieVisFn);
      expressions.registerRenderer(
        getPieVisRenderer({ theme: charts.theme, palettes: charts.palettes, getStartDeps })
      );
      expressions.registerFunction(pieLabelsExpressionFunction);
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
