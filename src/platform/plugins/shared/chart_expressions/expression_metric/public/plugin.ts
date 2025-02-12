/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { Plugin as ExpressionsPublicPlugin } from '@kbn/expressions-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { createStartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import { metricVisFunction } from '../common';
import { setFormatService, setPaletteService } from './services';
import { getMetricVisRenderer } from './expression_renderers';
import { setThemeService } from './services/theme_service';
import { setUiSettingsService } from './services/ui_settings';
import { metricTrendlineFunction } from '../common/expression_functions/metric_trendline_function';

/** @internal */
export interface ExpressionMetricPluginSetup {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  charts: ChartsPluginSetup;
}

/** @internal */
export interface ExpressionMetricPluginStart {
  fieldFormats: FieldFormatsStart;
  usageCollection?: UsageCollectionStart;
}

/** @internal */
export class ExpressionMetricPlugin implements Plugin {
  public setup(
    core: CoreSetup<ExpressionMetricPluginStart, void>,
    { expressions, charts }: ExpressionMetricPluginSetup
  ) {
    const getStartDeps = createStartServicesGetter<ExpressionMetricPluginStart, void>(
      core.getStartServices
    );

    charts.palettes.getPalettes().then((palettes) => {
      setPaletteService(palettes);
    });

    expressions.registerFunction(metricVisFunction);
    expressions.registerFunction(metricTrendlineFunction);
    expressions.registerRenderer(getMetricVisRenderer({ getStartDeps }));

    setUiSettingsService(core.uiSettings);
    setThemeService(charts.theme);
  }

  public start(core: CoreStart, { fieldFormats }: ExpressionMetricPluginStart) {
    setFormatService(fieldFormats);
  }
}
