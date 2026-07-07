/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CoreSetup,
  CoreStart,
  DocLinksStart,
  PluginInitializerContext,
  ThemeServiceStart,
} from '@kbn/core/public';
import type { VisualizationsSetup } from '@kbn/visualizations-plugin/public';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { PiePublicConfig } from '../server/config';
import { pieVisType } from './vis_type';
import { setDataViewsStart } from './services';

/** @internal */
export interface VisTypePieSetupDependencies {
  visualizations: VisualizationsSetup;
  charts: ChartsPluginSetup;
  usageCollection: UsageCollectionSetup;
}

/** @internal */
export interface VisTypePieStartDependencies {
  dataViews: DataViewsPublicPluginStart;
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
  initializerContext: PluginInitializerContext<PiePublicConfig>;

  constructor(initializerContext: PluginInitializerContext<PiePublicConfig>) {
    this.initializerContext = initializerContext;
  }

  setup(
    core: CoreSetup<VisTypePiePluginStartDependencies>,
    { visualizations, charts, usageCollection }: VisTypePieSetupDependencies
  ) {
    const { readOnly } = this.initializerContext.config.get<PiePublicConfig>();
    visualizations.createBaseVisualization({
      ...pieVisType({
        showElasticChartsOptions: true,
        palettes: charts.palettes,
      }),
      disableCreate: Boolean(readOnly),
      disableEdit: Boolean(readOnly),
    });
    return {};
  }

  start(core: CoreStart, { dataViews }: VisTypePieStartDependencies) {
    setDataViewsStart(dataViews);
  }
}
