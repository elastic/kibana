/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import { CoreSetup, CoreStart } from '@kbn/core/public';
import { Plugin as ExpressionsPublicPlugin } from '@kbn/expressions-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { gaugeFunction } from '../common';
import { setFormatService, setThemeService, setPaletteService } from './services';
import { gaugeRenderer } from './expression_renderers';

/** @internal */
export interface ExpressionGaugePluginSetup {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  charts: ChartsPluginSetup;
}

/** @internal */
export interface ExpressionGaugePluginStart {
  fieldFormats: FieldFormatsStart;
}

/** @internal */
export class ExpressionGaugePlugin {
  public setup(core: CoreSetup, { expressions, charts }: ExpressionGaugePluginSetup) {
    setThemeService(charts.theme);
    charts.palettes.getPalettes().then((palettes) => {
      setPaletteService(palettes);
    });

    expressions.registerFunction(gaugeFunction);
    expressions.registerRenderer(gaugeRenderer({ theme: core.theme }));
  }

  public start(core: CoreStart, { fieldFormats }: ExpressionGaugePluginStart) {
    setFormatService(fieldFormats);
  }
}
