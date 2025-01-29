/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ChartsPluginSetup, ChartsPluginStart } from '@kbn/charts-plugin/public';
import { CoreSetup, CoreStart } from '@kbn/core/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { Plugin as ExpressionsPublicPlugin } from '@kbn/expressions-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { createStartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { heatmapFunction, heatmapLegendConfig, heatmapGridConfig } from '../common';
import {
  setDatatableUtilities,
  setFormatService,
  setPaletteService,
  setUISettings,
} from './services';
import { heatmapRenderer } from './expression_renderers';

/** @internal */
export interface ExpressionHeatmapPluginSetup {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  charts: ChartsPluginSetup;
}

/** @internal */
export interface ExpressionHeatmapPluginStart {
  data: DataPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  charts: ChartsPluginStart;
  usageCollection?: UsageCollectionStart;
}

/** @internal */
export class ExpressionHeatmapPlugin {
  public setup(
    core: CoreSetup<ExpressionHeatmapPluginStart, void>,
    { expressions, charts }: ExpressionHeatmapPluginSetup
  ) {
    charts.palettes.getPalettes().then((palettes) => {
      setPaletteService(palettes);
    });
    setUISettings(core.uiSettings);

    const getStartDeps = createStartServicesGetter<ExpressionHeatmapPluginStart, void>(
      core.getStartServices
    );

    expressions.registerFunction(heatmapFunction);
    expressions.registerFunction(heatmapLegendConfig);
    expressions.registerFunction(heatmapGridConfig);
    expressions.registerRenderer(heatmapRenderer({ getStartDeps }));
  }

  public start(core: CoreStart, { data, fieldFormats }: ExpressionHeatmapPluginStart) {
    setFormatService(fieldFormats);
    setDatatableUtilities(data.datatableUtilities);
  }
}
