/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ChartsPluginSetup } from '../../../charts/public';
import { CoreSetup, CoreStart, Plugin } from '../../../../core/public';
import { Plugin as ExpressionsPublicPlugin } from '../../../expressions/public';
import { metricVisFunction } from '../common';
import { setFormatService, setPaletteService } from './services';
import { metricVisRenderer } from './expression_renderers';
import { FieldFormatsStart } from '../../../field_formats/public';

/** @internal */
export interface ExpressionMetricPluginSetup {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  charts: ChartsPluginSetup;
}

/** @internal */
export interface ExpressionMetricPluginStart {
  fieldFormats: FieldFormatsStart;
}

/** @internal */
export class ExpressionMetricPlugin implements Plugin<void, void> {
  public setup(core: CoreSetup, { expressions, charts }: ExpressionMetricPluginSetup) {
    expressions.registerFunction(metricVisFunction);
    expressions.registerRenderer(metricVisRenderer);
    charts.palettes.getPalettes().then((palettes) => {
      setPaletteService(palettes);
    });
  }

  public start(core: CoreStart, { fieldFormats }: ExpressionMetricPluginStart) {
    setFormatService(fieldFormats);
  }
}
