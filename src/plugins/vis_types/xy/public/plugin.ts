/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { Plugin as ExpressionsPublicPlugin } from '@kbn/expressions-plugin/public';
import type { VisualizationsSetup, VisualizationsStart } from '@kbn/visualizations-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { ChartsPluginSetup, ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type {
  UsageCollectionSetup,
  UsageCollectionStart,
} from '@kbn/usage-collection-plugin/public';
import { createStartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import {
  setDataActions,
  setFormatService,
  setThemeService,
  setUISettings,
  setDocLinks,
  setPalettesService,
  setActiveCursor,
} from './services';

import { visTypesDefinitions } from './vis_types';
import { getXYVisRenderer } from './vis_renderer';

import * as expressionFunctions from './expression_functions';

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
  fieldFormats: FieldFormatsStart;
  charts: ChartsPluginStart;
  usageCollection?: UsageCollectionStart;
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
    { expressions, visualizations, charts, usageCollection }: VisTypeXyPluginSetupDependencies
  ) {
    setUISettings(core.uiSettings);
    setThemeService(charts.theme);
    setPalettesService(charts.palettes);

    const getStartDeps = createStartServicesGetter<
      VisTypeXyPluginStartDependencies,
      VisTypeXyPluginStart
    >(core.getStartServices);

    expressions.registerRenderer(
      getXYVisRenderer({
        getStartDeps,
      })
    );
    expressions.registerFunction(expressionFunctions.visTypeXyVisFn);
    expressions.registerFunction(expressionFunctions.categoryAxis);
    expressions.registerFunction(expressionFunctions.timeMarker);
    expressions.registerFunction(expressionFunctions.valueAxis);
    expressions.registerFunction(expressionFunctions.seriesParam);
    expressions.registerFunction(expressionFunctions.thresholdLine);
    expressions.registerFunction(expressionFunctions.label);
    expressions.registerFunction(expressionFunctions.visScale);

    visTypesDefinitions.forEach(visualizations.createBaseVisualization);
    return {};
  }

  public start(core: CoreStart, { data, charts, fieldFormats }: VisTypeXyPluginStartDependencies) {
    setFormatService(fieldFormats);
    setDataActions(data.actions);
    setDocLinks(core.docLinks);
    setActiveCursor(charts.activeCursor);
    return {};
  }
}
