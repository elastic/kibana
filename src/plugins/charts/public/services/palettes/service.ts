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

import { CoreSetup } from 'kibana/public';
import { ExpressionsSetup } from '../../../../../../src/plugins/expressions/public';
import {
  ChartsPluginSetup,
  PaletteDefinition,
  PaletteRegistry,
} from '../../../../../../src/plugins/charts/public';
import { LegacyColorsService } from '../legacy_colors';

export interface PaletteSetupPlugins {
  expressions: ExpressionsSetup;
  charts: ChartsPluginSetup;
}

export class PaletteService {
  private palettes: Record<string, PaletteDefinition<unknown>> | undefined = undefined;
  constructor() {}

  public setup(core: CoreSetup, colorsService: LegacyColorsService) {
    return {
      getPalettes: async (): Promise<PaletteRegistry> => {
        if (!this.palettes) {
          const { buildPalettes } = await import('./palettes');
          this.palettes = buildPalettes(core.uiSettings, colorsService);
        }
        return {
          get: (name: string) => {
            return this.palettes![name];
          },
          getAll: () => {
            return Object.values(this.palettes!);
          },
        };
      },
    };
  }
}
