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
