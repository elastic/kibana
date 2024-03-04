/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ColorMapping } from '.';
import { AVAILABLE_PALETTES, getPalette } from '../palettes';
import { EUIAmsterdamColorBlindPalette } from '../palettes/eui_amsterdam';
import { NeutralPalette } from '../palettes/neutral';
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
      rule: {
        type: 'other',
      },
      color: {
        type: 'loop',
      },
      touched: false,
    },
  ],
  paletteId: EUIAmsterdamColorBlindPalette.id,
  colorMode: {
    type: 'categorical',
  },
};

export function getPaletteColors(
  isDarkMode: boolean,
  colorMappings?: ColorMapping.Config
): string[] {
  const colorMappingModel = colorMappings ?? { ...DEFAULT_COLOR_MAPPING_CONFIG };
  const palette = getPalette(AVAILABLE_PALETTES, NeutralPalette)(colorMappingModel.paletteId);
  return getPaletteColorsFromPaletteId(isDarkMode, palette.id);
}

export function getPaletteColorsFromPaletteId(
  isDarkMode: boolean,
  paletteId: ColorMapping.Config['paletteId']
): string[] {
  const palette = getPalette(AVAILABLE_PALETTES, NeutralPalette)(paletteId);
  return Array.from({ length: palette.colorCount }, (d, i) =>
    palette.getColor(i, isDarkMode, true)
  );
}

export function getColorsFromMapping(
  isDarkMode: boolean,
  colorMappings?: ColorMapping.Config
): string[] {
  const { colorMode, paletteId, assignments, specialAssignments } = colorMappings ?? {
    ...DEFAULT_COLOR_MAPPING_CONFIG,
  };

  const getPaletteFn = getPalette(AVAILABLE_PALETTES, NeutralPalette);
  if (colorMode.type === 'gradient') {
    const colorScale = getGradientColorScale(colorMode, getPaletteFn, isDarkMode);
    return Array.from({ length: 6 }, (d, i) => colorScale(i / 6));
  } else {
    const palette = getPaletteFn(paletteId);
    const otherColors =
      specialAssignments[DEFAULT_OTHER_ASSIGNMENT_INDEX].color.type === 'loop'
        ? Array.from({ length: palette.colorCount }, (d, i) =>
            palette.getColor(i, isDarkMode, true)
          )
        : [
            getColor(
              specialAssignments[DEFAULT_OTHER_ASSIGNMENT_INDEX].color,
              getPaletteFn,
              isDarkMode
            ),
          ];
    return [
      ...assignments.map((a) => {
        return a.color.type === 'gradient' ? '' : getColor(a.color, getPaletteFn, isDarkMode);
      }),
      ...otherColors,
    ].filter((color) => color !== '');
  }
}
