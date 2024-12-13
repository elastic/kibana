/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ChartsPlugin } from './plugin';
import { themeServiceMock } from './services/theme/mock';
import { activeCursorMock } from './services/active_cursor/mock';
import { getPaletteRegistry, paletteServiceMock } from './services/palettes/mock';

export { MOCK_SPARKLINE_THEME } from './services/theme/mock';

export type Setup = jest.Mocked<ReturnType<ChartsPlugin['setup']>>;
export type Start = jest.Mocked<ReturnType<ChartsPlugin['start']>>;

const createSetupContract = (): Setup => ({
  theme: themeServiceMock,
  palettes: paletteServiceMock.setup(),
});

const createStartContract = (): Start => ({
  theme: themeServiceMock,
  activeCursor: activeCursorMock,
  palettes: paletteServiceMock.setup(),
});

export const chartPluginMock = {
  createSetupContract,
  createStartContract,
  createPaletteRegistry: getPaletteRegistry,
};
