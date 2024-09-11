/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/public';
import { VisualizationsSetup } from '@kbn/visualizations-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { GaugePublicConfig } from '../server/config';
import { LEGACY_GAUGE_CHARTS_LIBRARY } from '../common';
import { VisTypeGaugePluginSetup } from './types';
import { gaugeVisType, goalVisType } from './vis_type';
import { setDataViewsStart } from './services';

/** @internal */
export interface VisTypeGaugeSetupDependencies {
  visualizations: VisualizationsSetup;
}

/** @internal */
export interface VisTypeGaugePluginStartDependencies {
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
}

export class VisTypeGaugePlugin {
  private readonly initializerContext: PluginInitializerContext<GaugePublicConfig>;

  constructor(initializerContext: PluginInitializerContext<GaugePublicConfig>) {
    this.initializerContext = initializerContext;
  }

  public setup(
    core: CoreSetup<VisTypeGaugeSetupDependencies>,
    { visualizations }: VisTypeGaugeSetupDependencies
  ): VisTypeGaugePluginSetup {
    if (!core.uiSettings.get(LEGACY_GAUGE_CHARTS_LIBRARY)) {
      const { readOnly } = this.initializerContext.config.get<GaugePublicConfig>();
      const visTypeProps = { showElasticChartsOptions: true };
      visualizations.createBaseVisualization({
        ...gaugeVisType(visTypeProps),
        disableCreate: Boolean(readOnly),
        disableEdit: Boolean(readOnly),
      });
      visualizations.createBaseVisualization({
        ...goalVisType(visTypeProps),
        disableCreate: Boolean(readOnly),
        disableEdit: Boolean(readOnly),
      });
    }

    return {};
  }

  public start(core: CoreStart, { dataViews }: VisTypeGaugePluginStartDependencies) {
    setDataViewsStart(dataViews);
  }
}
