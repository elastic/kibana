/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Plugin, CoreSetup } from 'kibana/public';
import { ExpressionsSetup } from '../../expressions/public';
import { palette, systemPalette } from '../common';

import { ThemeService, LegacyColorsService } from './services';
import { PaletteService } from './services/palettes/service';

export type Theme = Omit<ThemeService, 'init'>;
export type Color = Omit<LegacyColorsService, 'init'>;

interface SetupDependencies {
  expressions: ExpressionsSetup;
}

/** @public */
export interface ChartsPluginSetup {
  legacyColors: Color;
  theme: Theme;
  palettes: ReturnType<PaletteService['setup']>;
}

/** @public */
export type ChartsPluginStart = ChartsPluginSetup;

/** @public */
export class ChartsPlugin implements Plugin<ChartsPluginSetup, ChartsPluginStart> {
  private readonly themeService = new ThemeService();
  private readonly legacyColorsService = new LegacyColorsService();
  private readonly paletteService = new PaletteService();

  private palettes: undefined | ReturnType<PaletteService['setup']>;

  public setup(core: CoreSetup, dependencies: SetupDependencies): ChartsPluginSetup {
    dependencies.expressions.registerFunction(palette);
    dependencies.expressions.registerFunction(systemPalette);
    this.themeService.init(core.uiSettings);
    this.legacyColorsService.init(core.uiSettings);
    this.palettes = this.paletteService.setup(core, this.legacyColorsService);

    return {
      legacyColors: this.legacyColorsService,
      theme: this.themeService,
      palettes: this.palettes,
    };
  }

  public start(): ChartsPluginStart {
    return {
      legacyColors: this.legacyColorsService,
      theme: this.themeService,
      palettes: this.palettes!,
    };
  }
}
