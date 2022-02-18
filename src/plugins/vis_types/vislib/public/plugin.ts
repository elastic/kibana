/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'kibana/public';

import { Plugin as ExpressionsPublicPlugin } from '../../../expressions/public';
import { VisualizationsSetup } from '../../../visualizations/public';
import { ChartsPluginSetup } from '../../../charts/public';
import { DataPublicPluginStart } from '../../../data/public';
import { LEGACY_PIE_CHARTS_LIBRARY } from '../../pie/common/index';
import { LEGACY_HEATMAP_CHARTS_LIBRARY } from '../../heatmap/common/index';
import { LEGACY_GAUGE_CHARTS_LIBRARY } from '../../gauge/common/index';
import { heatmapVisTypeDefinition } from './heatmap';

import { createVisTypeVislibVisFn } from './vis_type_vislib_vis_fn';
import { createPieVisFn } from './pie_fn';
import { pieVisTypeDefinition } from './pie';
import { setFormatService, setDataActions, setTheme } from './services';
import { getVislibVisRenderer } from './vis_renderer';
import { gaugeVisTypeDefinition } from './gauge';
import { goalVisTypeDefinition } from './goal';

/** @internal */
export interface VisTypeVislibPluginSetupDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  visualizations: VisualizationsSetup;
  charts: ChartsPluginSetup;
}

/** @internal */
export interface VisTypeVislibPluginStartDependencies {
  data: DataPublicPluginStart;
}

export type VisTypeVislibCoreSetup = CoreSetup<VisTypeVislibPluginStartDependencies, void>;

/** @internal */
export class VisTypeVislibPlugin
  implements
    Plugin<void, void, VisTypeVislibPluginSetupDependencies, VisTypeVislibPluginStartDependencies>
{
  constructor(public initializerContext: PluginInitializerContext) {}

  public setup(
    core: VisTypeVislibCoreSetup,
    { expressions, visualizations, charts }: VisTypeVislibPluginSetupDependencies
  ) {
    // register vislib XY axis charts

    expressions.registerRenderer(getVislibVisRenderer(core, charts));
    expressions.registerFunction(createVisTypeVislibVisFn());

    if (core.uiSettings.get(LEGACY_PIE_CHARTS_LIBRARY, false)) {
      // register vislib pie chart
      visualizations.createBaseVisualization(pieVisTypeDefinition);
      expressions.registerFunction(createPieVisFn());
    }

    if (core.uiSettings.get(LEGACY_HEATMAP_CHARTS_LIBRARY)) {
      // register vislib heatmap chart
      visualizations.createBaseVisualization(heatmapVisTypeDefinition);
    }

    if (core.uiSettings.get(LEGACY_GAUGE_CHARTS_LIBRARY)) {
      // register vislib gauge and goal charts
      visualizations.createBaseVisualization(gaugeVisTypeDefinition);
      visualizations.createBaseVisualization(goalVisTypeDefinition);
    }
  }

  public start(core: CoreStart, { data }: VisTypeVislibPluginStartDependencies) {
    setFormatService(data.fieldFormats);
    setDataActions(data.actions);
    setTheme(core.theme);
  }
}
