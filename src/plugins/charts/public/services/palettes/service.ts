/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
