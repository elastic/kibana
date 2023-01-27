/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { Plugin as ExpressionsPublicPlugin } from '@kbn/expressions-plugin/public';
import type { VisualizationsSetup } from '@kbn/visualizations-plugin/public';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';

import { LEGACY_HEATMAP_CHARTS_LIBRARY } from '@kbn/vis-type-heatmap-plugin/common';
import { LEGACY_GAUGE_CHARTS_LIBRARY } from '@kbn/vis-type-gauge-plugin/common';
import { setUsageCollectionStart } from './services';
import { heatmapVisTypeDefinition } from './heatmap';

import { createVisTypeVislibVisFn } from './vis_type_vislib_vis_fn';
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
  fieldFormats: FieldFormatsStart;
  usageCollection?: UsageCollectionStart;
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

  public start(
    core: CoreStart,
    { data, usageCollection, fieldFormats }: VisTypeVislibPluginStartDependencies
  ) {
    setFormatService(fieldFormats);
    setDataActions(data.actions);
    setTheme(core.theme);
    if (usageCollection) {
      setUsageCollectionStart(usageCollection);
    }
  }
}
