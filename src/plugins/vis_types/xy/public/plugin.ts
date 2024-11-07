/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { VisualizationsSetup } from '@kbn/visualizations-plugin/public';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { XyPublicConfig } from '../server/config';
import { setUISettings, setPalettesService, setDataViewsStart } from './services';

import { visTypesDefinitions } from './vis_types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface VisTypeXyPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface VisTypeXyPluginStart {}

/** @internal */
export interface VisTypeXyPluginSetupDependencies {
  visualizations: VisualizationsSetup;
  charts: ChartsPluginSetup;
}

/** @internal */
export interface VisTypeXyPluginStartDependencies {
  dataViews: DataViewsPublicPluginStart;
}

type VisTypeXyCoreSetup = CoreSetup<{}, VisTypeXyPluginStart>;

/** @internal */
export class VisTypeXyPlugin
  implements
    Plugin<VisTypeXyPluginSetup, VisTypeXyPluginStart, VisTypeXyPluginSetupDependencies, {}>
{
  initializerContext: PluginInitializerContext<XyPublicConfig>;

  constructor(initializerContext: PluginInitializerContext<XyPublicConfig>) {
    this.initializerContext = initializerContext;
  }

  public setup(
    core: VisTypeXyCoreSetup,
    { visualizations, charts }: VisTypeXyPluginSetupDependencies
  ) {
    setUISettings(core.uiSettings);
    setPalettesService(charts.palettes);

    const { readOnly } = this.initializerContext.config.get<XyPublicConfig>();
    visTypesDefinitions.forEach((visTypeDefinition) =>
      visualizations.createBaseVisualization({
        ...visTypeDefinition,
        disableCreate: Boolean(readOnly),
        disableEdit: Boolean(readOnly),
      })
    );
    return {};
  }

  public start(core: CoreStart, { dataViews }: VisTypeXyPluginStartDependencies) {
    setDataViewsStart(dataViews);
    return {};
  }
}
