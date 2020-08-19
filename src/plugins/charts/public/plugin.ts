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

import { ThemeService, LegacyColorsService } from './services';

export type Theme = Omit<ThemeService, 'init'>;
export type Color = Omit<LegacyColorsService, 'init'>;

/** @public */
export interface ChartsPluginSetup {
  legacyColors: Color;
  theme: Theme;
}

/** @public */
export type ChartsPluginStart = ChartsPluginSetup;

/** @public */
export class ChartsPlugin implements Plugin<ChartsPluginSetup, ChartsPluginStart> {
  private readonly themeService = new ThemeService();
  private readonly legacyColorsService = new LegacyColorsService();

  public setup({ uiSettings }: CoreSetup): ChartsPluginSetup {
    this.themeService.init(uiSettings);
    this.legacyColorsService.init(uiSettings);

    return {
      legacyColors: this.legacyColorsService,
      theme: this.themeService,
    };
  }

  public start(): ChartsPluginStart {
    return {
      legacyColors: this.legacyColorsService,
      theme: this.themeService,
    };
  }
}
