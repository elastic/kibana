/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '../../../core/public';
import { Plugin as ExpressionsPublicPlugin } from '../../expressions/public';
import { VisualizationsSetup, VisualizationsStart } from '../../visualizations/public';
import { ChartsPluginSetup } from '../../charts/public';
import { DataPublicPluginStart } from '../../data/public';
import { UsageCollectionSetup } from '../../usage_collection/public';

import { createVisTypeXyVisFn } from './xy_vis_fn';
import { categoryAxis as categoryAxisExpressionFunction } from './expression_functions/category_axis';
import { timeMarker as timeMarkerExpressionFunction } from './expression_functions/time_marker';
import { valueAxis as valueAxisExpressionFunction } from './expression_functions/value_axis';
import { seriesParam as seriesParamExpressionFunction } from './expression_functions/series_param';
import { thresholdLine as thresholdLineExpressionFunction } from './expression_functions/threshold_line';
import { label as labelExpressionFunction } from './expression_functions/label';
import { visScale as visScaleExpressionFunction } from './expression_functions/vis_scale';
import { xyDimension as xyDimensionExpressionFunction } from './expression_functions/xy_dimension';
import {
  setDataActions,
  setFormatService,
  setThemeService,
  setUISettings,
  setDocLinks,
  setPalettesService,
  setTrackUiMetric,
} from './services';
import { visTypesDefinitions } from './vis_types';
import { LEGACY_CHARTS_LIBRARY } from '../common';
import { xyVisRenderer } from './vis_renderer';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface VisTypeXyPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface VisTypeXyPluginStart {}

/** @internal */
export interface VisTypeXyPluginSetupDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  visualizations: VisualizationsSetup;
  charts: ChartsPluginSetup;
  usageCollection: UsageCollectionSetup;
}

/** @internal */
export interface VisTypeXyPluginStartDependencies {
  expressions: ReturnType<ExpressionsPublicPlugin['start']>;
  visualizations: VisualizationsStart;
  data: DataPublicPluginStart;
}

type VisTypeXyCoreSetup = CoreSetup<VisTypeXyPluginStartDependencies, VisTypeXyPluginStart>;

/** @internal */
export class VisTypeXyPlugin
  implements
    Plugin<
      VisTypeXyPluginSetup,
      VisTypeXyPluginStart,
      VisTypeXyPluginSetupDependencies,
      VisTypeXyPluginStartDependencies
    > {
  public setup(
    core: VisTypeXyCoreSetup,
    { expressions, visualizations, charts, usageCollection }: VisTypeXyPluginSetupDependencies
  ) {
    if (!core.uiSettings.get(LEGACY_CHARTS_LIBRARY, false)) {
      setUISettings(core.uiSettings);
      setThemeService(charts.theme);
      setPalettesService(charts.palettes);
      [
        timeMarkerExpressionFunction,
        thresholdLineExpressionFunction,
        labelExpressionFunction,
        visScaleExpressionFunction,
        valueAxisExpressionFunction,
        xyDimensionExpressionFunction,
        seriesParamExpressionFunction,
        categoryAxisExpressionFunction,
        createVisTypeXyVisFn,
      ].forEach(expressions.registerFunction);
      expressions.registerRenderer(xyVisRenderer);
      visTypesDefinitions.forEach(visualizations.createBaseVisualization);
    }

    setTrackUiMetric(usageCollection?.reportUiCounter.bind(usageCollection, 'vis_type_xy'));

    return {};
  }

  public start(core: CoreStart, { data }: VisTypeXyPluginStartDependencies) {
    setFormatService(data.fieldFormats);
    setDataActions(data.actions);
    setDocLinks(core.docLinks);

    return {};
  }
}
