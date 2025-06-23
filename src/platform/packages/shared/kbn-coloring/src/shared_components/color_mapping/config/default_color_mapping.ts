/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KbnPalettes } from '@kbn/palettes';
import { ColorMapping } from '.';
import { getColor, getGradientColorScale } from '../color/color_handling';

export const DEFAULT_NEUTRAL_PALETTE_INDEX = 1;
export const DEFAULT_OTHER_ASSIGNMENT_INDEX = 0;

/**
 * The default color mapping used in Kibana, starts with the EUI color palette
 */
export const DEFAULT_COLOR_MAPPING_CONFIG: ColorMapping.Config = {
  assignments: [],
  specialAssignments: [
    {
      rules: [
        {
          type: 'other',
        },
      ],
      color: {
        type: 'loop',
      },
      touched: false,
    },
  ],
  paletteId: 'default',
  colorMode: {
    type: 'categorical',
  },
};

export function getPaletteColors(
  palettes: KbnPalettes,
  colorMappings?: ColorMapping.Config
): string[] {
  const colorMappingModel = colorMappings ?? { ...DEFAULT_COLOR_MAPPING_CONFIG };
  const palette = palettes.get(colorMappingModel.paletteId);
  return getPaletteColorsFromPaletteId(palettes, palette.id);
}

export function getPaletteColorsFromPaletteId(
  palettes: KbnPalettes,
  paletteId: ColorMapping.Config['paletteId']
): string[] {
  const palette = palettes.get(paletteId);
  return Array.from({ length: palette.colorCount }, (d, i) => palette.getColor(i));
}

export function getColorsFromMapping(
  palettes: KbnPalettes,
  isDarkMode: boolean,
  colorMappings?: ColorMapping.Config
): string[] {
  const { colorMode, paletteId, assignments, specialAssignments } = colorMappings ?? {
    ...DEFAULT_COLOR_MAPPING_CONFIG,
  };

  if (colorMode.type === 'gradient') {
    const colorScale = getGradientColorScale(colorMode, palettes, isDarkMode);
    return Array.from({ length: 6 }, (d, i) => colorScale(i / 6));
  } else {
    const palette = palettes.get(paletteId);
    const otherColors =
      specialAssignments[DEFAULT_OTHER_ASSIGNMENT_INDEX].color.type === 'loop'
        ? Array.from({ length: palette.colorCount }, (d, i) => palette.getColor(i))
        : [getColor(specialAssignments[DEFAULT_OTHER_ASSIGNMENT_INDEX].color, palettes)];
    return [
      ...assignments.map((a) => {
        return a.color.type === 'gradient' ? '' : getColor(a.color, palettes);
      }),
      ...otherColors,
    ].filter((color) => color !== '');
  }
}
