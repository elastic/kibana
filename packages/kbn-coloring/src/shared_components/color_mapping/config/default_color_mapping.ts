/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ColorMapping } from '.';
import { NeutralPalette, availablePalettes, getPalette } from '../palettes/default_palettes';

export const DEFAULT_COLOR_MAPPING_CONFIG: ColorMapping.Config = {
  assignmentMode: 'auto',
  assignments: [],
  specialAssignments: [
    {
      rule: {
        type: 'other',
      },
      color: {
        type: 'categorical',
        paletteId: NeutralPalette.id,
        colorIndex: 2,
      },
      touched: false,
    },
  ],
  paletteId: 'eui',
  colorMode: {
    type: 'categorical',
  },
};

export function getPaletteColors(
  isDarkMode: boolean,
  colorMappings?: ColorMapping.Config
): string[] {
  const colorMappingModel = colorMappings ?? { ...DEFAULT_COLOR_MAPPING_CONFIG };
  const palette = getPalette(availablePalettes, NeutralPalette)(colorMappingModel.paletteId);
  return Array.from({ length: palette.colorCount }, (d, i) => palette.getColor(i, isDarkMode));
}
