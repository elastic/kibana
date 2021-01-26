/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '../../../core/public';
import { Plugin as ExpressionsPublicPlugin } from '../../expressions/public';
import { VisualizationsSetup, VisualizationsStart } from '../../visualizations/public';
import { ChartsPluginSetup } from '../../charts/public';
import { DataPublicPluginStart } from '../../data/public';
import { UsageCollectionSetup } from '../../usage_collection/public';

import { createVisTypeXyVisFn } from './xy_vis_fn';
import {
  setDataActions,
  setFormatService,
  setThemeService,
  setTimefilter,
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
  public async setup(
    core: VisTypeXyCoreSetup,
    { expressions, visualizations, charts, usageCollection }: VisTypeXyPluginSetupDependencies
  ) {
    if (!core.uiSettings.get(LEGACY_CHARTS_LIBRARY, false)) {
      setUISettings(core.uiSettings);
      setThemeService(charts.theme);
      setPalettesService(charts.palettes);
      [createVisTypeXyVisFn].forEach(expressions.registerFunction);
      expressions.registerRenderer(xyVisRenderer);
      visTypesDefinitions.forEach(visualizations.createBaseVisualization);
    }

    setTrackUiMetric(usageCollection?.reportUiCounter.bind(usageCollection, 'vis_type_xy'));

    return {};
  }

  public start(core: CoreStart, { data }: VisTypeXyPluginStartDependencies) {
    setFormatService(data.fieldFormats);
    setDataActions(data.actions);
    setTimefilter(data.query.timefilter.timefilter);
    setDocLinks(core.docLinks);

    return {};
  }
}
