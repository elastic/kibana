/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { ExpressionsSetup } from '../../../../expressions/public/plugin';
import type { ChartsPluginSetup } from '../../plugin';
import { LegacyColorsService } from '../legacy_colors/colors';
import type { PaletteDefinition, PaletteRegistry } from './types';

export interface PaletteSetupPlugins {
  expressions: ExpressionsSetup;
  charts: ChartsPluginSetup;
}

export class PaletteService {
  private palettes: Record<string, PaletteDefinition<unknown>> | undefined = undefined;
  constructor() {}

  public setup(colorsService: LegacyColorsService) {
    return {
      getPalettes: async (): Promise<PaletteRegistry> => {
        if (!this.palettes) {
          const { buildPalettes } = await import('./palettes');
          this.palettes = buildPalettes(colorsService);
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
