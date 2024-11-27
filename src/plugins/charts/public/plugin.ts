/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Plugin, CoreSetup, CoreStart } from '@kbn/core/public';
import { ExpressionsSetup } from '@kbn/expressions-plugin/public';
import { palette, systemPalette } from '../common';

import { ThemeService } from './services';
import { PaletteService } from './services/palettes/service';
import { ActiveCursor } from './services/active_cursor';

interface SetupDependencies {
  expressions: ExpressionsSetup;
}

/** @public */
export interface ChartsPluginSetup {
  theme: Omit<ThemeService, 'init'>;
  palettes: ReturnType<PaletteService['setup']>;
}

/** @public */
export type ChartsPluginStart = ChartsPluginSetup & {
  activeCursor: ActiveCursor;
};

/** @public */
export class ChartsPlugin implements Plugin<ChartsPluginSetup, ChartsPluginStart> {
  private readonly themeService = new ThemeService();
  private readonly paletteService = new PaletteService();
  private readonly activeCursor = new ActiveCursor();

  private palettes: undefined | ReturnType<PaletteService['setup']>;

  public setup(core: CoreSetup, dependencies: SetupDependencies): ChartsPluginSetup {
    dependencies.expressions.registerFunction(palette);
    dependencies.expressions.registerFunction(systemPalette);
    this.themeService.init(core.theme);
    this.palettes = this.paletteService.setup(core.theme);
    this.activeCursor.setup();

    return {
      theme: this.themeService,
      palettes: this.palettes,
    };
  }

  public start(core: CoreStart): ChartsPluginStart {
    return {
      theme: this.themeService,
      palettes: this.palettes ?? this.paletteService.setup(core.theme),
      activeCursor: this.activeCursor,
    };
  }
}
