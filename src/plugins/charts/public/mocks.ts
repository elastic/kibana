/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ChartsPlugin } from './plugin';
import { themeServiceMock } from './services/theme/mock';
import { activeCursorMock } from './services/active_cursor/mock';
import { colorsServiceMock } from './services/legacy_colors/mock';
import { getPaletteRegistry, paletteServiceMock } from './services/palettes/mock';

export { MOCK_SPARKLINE_THEME } from './services/theme/mock';

export type Setup = jest.Mocked<ReturnType<ChartsPlugin['setup']>>;
export type Start = jest.Mocked<ReturnType<ChartsPlugin['start']>>;

const createSetupContract = (): Setup => ({
  legacyColors: colorsServiceMock,
  theme: themeServiceMock,
  palettes: paletteServiceMock.setup({} as any),
});

const createStartContract = (): Start => ({
  legacyColors: colorsServiceMock,
  theme: themeServiceMock,
  activeCursor: activeCursorMock,
  palettes: paletteServiceMock.setup({} as any),
});

export const chartPluginMock = {
  createSetupContract,
  createStartContract,
  createPaletteRegistry: getPaletteRegistry,
};
