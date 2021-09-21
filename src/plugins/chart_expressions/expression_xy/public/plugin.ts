/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '../../../../core/public';
import { FieldFormatsStart } from '../../../field_formats/public';
import { VisualizationsSetup, VisualizationsStart } from '../../../visualizations/public';
import { Plugin as ExpressionsPublicPlugin } from '../../../expressions/public';
import { ChartsPluginSetup, ChartsPluginStart } from '../../../charts/public';
import { DataPublicPluginStart } from '../../../data/public';
import { UsageCollectionSetup } from '../../../usage_collection/public';
import { xyVisRenderer } from './vis_renderer';

import * as expressionFunctions from '../common/expression_functions';
import {
  setActiveCursor,
  setDataActions,
  setFormatService,
  setPalettesService,
  setThemeService,
  setUISettings,
} from './services';

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
  charts: ChartsPluginStart;
  fieldFormats: FieldFormatsStart;
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
    >
{
  public setup(
    core: VisTypeXyCoreSetup,
    { expressions, charts }: VisTypeXyPluginSetupDependencies
  ) {
    setUISettings(core.uiSettings);
    setThemeService(charts.theme);
    setPalettesService(charts.palettes);

    expressions.registerRenderer(xyVisRenderer);
    expressions.registerFunction(expressionFunctions.visTypeXyVisFn);
    expressions.registerFunction(expressionFunctions.categoryAxis);
    expressions.registerFunction(expressionFunctions.timeMarker);
    expressions.registerFunction(expressionFunctions.valueAxis);
    expressions.registerFunction(expressionFunctions.seriesParam);
    expressions.registerFunction(expressionFunctions.thresholdLine);
    expressions.registerFunction(expressionFunctions.label);
    expressions.registerFunction(expressionFunctions.visScale);
    expressions.registerFunction(expressionFunctions.xDomain);
    return {};
  }

  public start(core: CoreStart, { data, charts, fieldFormats }: VisTypeXyPluginStartDependencies) {
    setFormatService(fieldFormats);
    setDataActions(data.actions);
    setActiveCursor(charts.activeCursor);
    return {};
  }
}
