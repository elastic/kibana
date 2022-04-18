/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { VisualizationsSetup } from '@kbn/visualizations-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { CoreSetup } from '@kbn/core/public';
import { LEGACY_GAUGE_CHARTS_LIBRARY } from '../common';
import { VisTypeGaugePluginSetup } from './types';
import { gaugeVisType, goalVisType } from './vis_type';

/** @internal */
export interface VisTypeGaugeSetupDependencies {
  visualizations: VisualizationsSetup;
}

/** @internal */
export interface VisTypePiePluginStartDependencies {
  data: DataPublicPluginStart;
}

export class VisTypeGaugePlugin {
  public setup(
    core: CoreSetup<VisTypePiePluginStartDependencies>,
    { visualizations }: VisTypeGaugeSetupDependencies
  ): VisTypeGaugePluginSetup {
    if (!core.uiSettings.get(LEGACY_GAUGE_CHARTS_LIBRARY)) {
      const visTypeProps = { showElasticChartsOptions: true };
      visualizations.createBaseVisualization(gaugeVisType(visTypeProps));
      visualizations.createBaseVisualization(goalVisType(visTypeProps));
    }

    return {};
  }

  public start() {}
}
