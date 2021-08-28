
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PaletteService } from './services/palettes/service';
import type { ThemeService } from './services/theme/theme';
import type { LegacyColorsService } from './services/legacy_colors/colors';
import { ActiveCursor } from './services/active_cursor/active_cursor';

export type Theme = Omit<ThemeService, 'init'>;
export type Color = Omit<LegacyColorsService, 'init'>;

/** @public */
export interface ChartsPluginSetup {
  legacyColors: Color;
  theme: Theme;
  palettes: ReturnType<PaletteService['setup']>;
}

/** @public */
export type ChartsPluginStart = ChartsPluginSetup & {
  activeCursor: ActiveCursor;
};
