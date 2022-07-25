/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { Plugin as ExpressionsPublicPlugin } from '@kbn/expressions-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { createStartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { metricVisFunction } from '../common';
import { setFormatService, setPaletteService } from './services';
import { getMetricVisRenderer } from './expression_renderers';

/** @internal */
export interface ExpressionLegacyMetricPluginSetup {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  charts: ChartsPluginSetup;
}

/** @internal */
export interface ExpressionLegacyMetricPluginStart {
  fieldFormats: FieldFormatsStart;
  usageCollection?: UsageCollectionStart;
}

/** @internal */
export class ExpressionLegacyMetricPlugin implements Plugin {
  public setup(
    core: CoreSetup<ExpressionLegacyMetricPluginStart, void>,
    { expressions, charts }: ExpressionLegacyMetricPluginSetup
  ) {
    const getStartDeps = createStartServicesGetter<ExpressionLegacyMetricPluginStart, void>(
      core.getStartServices
    );

    charts.palettes.getPalettes().then((palettes) => {
      setPaletteService(palettes);
    });

    expressions.registerFunction(metricVisFunction);
    expressions.registerRenderer(getMetricVisRenderer({ getStartDeps }));
  }

  public start(core: CoreStart, { fieldFormats }: ExpressionLegacyMetricPluginStart) {
    setFormatService(fieldFormats);
  }
}
