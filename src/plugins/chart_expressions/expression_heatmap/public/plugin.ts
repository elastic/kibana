/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ChartsPluginSetup } from '../../../charts/public';
import { CoreSetup, CoreStart } from '../../../../core/public';
import { Plugin as ExpressionsPublicPlugin } from '../../../expressions/public';
import { heatmapFunction, heatmapLegendConfig, heatmapGridConfig } from '../common';
import { setFormatService, setPaletteService, setUISettings, setThemeService } from './services';
import { heatmapRenderer } from './expression_renderers';
import type { FieldFormatsStart } from '../../../field_formats/public';

/** @internal */
export interface ExpressionHeatmapPluginSetup {
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  charts: ChartsPluginSetup;
}

/** @internal */
export interface ExpressionHeatmapPluginStart {
  fieldFormats: FieldFormatsStart;
}

/** @internal */
export class ExpressionHeatmapPlugin {
  public setup(core: CoreSetup, { expressions, charts }: ExpressionHeatmapPluginSetup) {
    charts.palettes.getPalettes().then((palettes) => {
      setPaletteService(palettes);
    });
    setUISettings(core.uiSettings);
    setThemeService(charts.theme);
    expressions.registerFunction(heatmapFunction);
    expressions.registerFunction(heatmapLegendConfig);
    expressions.registerFunction(heatmapGridConfig);
    expressions.registerRenderer(heatmapRenderer({ theme: core.theme }));
  }

  public start(core: CoreStart, { fieldFormats }: ExpressionHeatmapPluginStart) {
    setFormatService(fieldFormats);
  }
}
