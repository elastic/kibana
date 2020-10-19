/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { ChartsPlugin } from './plugin';
import { themeServiceMock } from './services/theme/mock';
import { colorsServiceMock } from './services/legacy_colors/mock';
import { getPaletteRegistry, paletteServiceMock } from './services/palettes/mock';

export type Setup = jest.Mocked<ReturnType<ChartsPlugin['setup']>>;
export type Start = jest.Mocked<ReturnType<ChartsPlugin['start']>>;

const createSetupContract = (): Setup => ({
  legacyColors: colorsServiceMock,
  theme: themeServiceMock,
  palettes: paletteServiceMock.setup({} as any, {} as any),
});

const createStartContract = (): Start => ({
  legacyColors: colorsServiceMock,
  theme: themeServiceMock,
  palettes: paletteServiceMock.setup({} as any, {} as any),
});

export { colorMapsMock } from './static/color_maps/mock';

export const chartPluginMock = {
  createSetupContract,
  createStartContract,
  createPaletteRegistry: getPaletteRegistry,
};
