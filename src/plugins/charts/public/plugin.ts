/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { CoreSetup } from '../../../core/public/types';
import type { Plugin } from '../../../core/public/plugins/plugin';
import type { ExpressionsSetup } from '../../expressions/public/plugin';
import { palette, systemPalette } from '../common/palette';
import { ActiveCursor } from './services/active_cursor/active_cursor';
import { LegacyColorsService } from './services/legacy_colors/colors';
import { PaletteService } from './services/palettes/service';
import { ThemeService } from './services/theme/theme';

import type {
  ChartsPluginStart,
  ChartsPluginSetup,
} from './types';

interface SetupDependencies {
  expressions: ExpressionsSetup;
}

/** @public */
export class ChartsPlugin implements Plugin<ChartsPluginSetup, ChartsPluginStart> {
  private readonly themeService = new ThemeService();
  private readonly legacyColorsService = new LegacyColorsService();
  private readonly paletteService = new PaletteService();
  private readonly activeCursor = new ActiveCursor();

  private palettes: undefined | ReturnType<PaletteService['setup']>;

  public setup(core: CoreSetup, dependencies: SetupDependencies): ChartsPluginSetup {
    dependencies.expressions.registerFunction(palette);
    dependencies.expressions.registerFunction(systemPalette);
    this.themeService.init(core.uiSettings);
    this.legacyColorsService.init(core.uiSettings);
    this.palettes = this.paletteService.setup(this.legacyColorsService);

    this.activeCursor.setup();

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
      activeCursor: this.activeCursor,
    };
  }
}
