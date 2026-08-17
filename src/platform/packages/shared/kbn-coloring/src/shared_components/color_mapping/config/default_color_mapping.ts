/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KbnPalettes } from '@kbn/palettes';
import { KbnPalette } from '@kbn/palettes';
import type { ColorMapping } from '.';
import { getColor, getGradientColorScale } from '../color/color_handling';
import { getOtherAssignmentColor } from './utils';
import { OTHER_BUCKET_VALUE } from '../special_tokens';

export const DEFAULT_NEUTRAL_PALETTE_INDEX = 1;

// neutral palette is ordered from light to dark in both themes, so we mirror
// the index to keep a comparable contrast against the background for each
// theme
export const DEFAULT_NEUTRAL_DARK_MODE_PALETTE_INDEX = 3;

export const DEFAULT_OTHER_ASSIGNMENT_INDEX = 0;

export const DEFAULT_OTHER_ASSIGNMENT: ColorMapping.AssignmentBase<
  ColorMapping.RuleOthers,
  ColorMapping.LoopColor
> = {
  rules: [{ type: 'other' }],
  color: { type: 'loop' },
  touched: false,
};

export const isOtherBucketRule = (rule: ColorMapping.ColorRule) =>
  rule.type === 'raw' && rule.value === OTHER_BUCKET_VALUE;

export const withOtherBucketAssignment = (
  config: ColorMapping.Config,
  isDarkMode: boolean
): ColorMapping.Config => {
  if (config.assignments.every((assignment) => !assignment.rules.some(isOtherBucketRule))) {
    return {
      ...config,
      assignments: [
        ...config.assignments,
        {
          rules: [{ type: 'raw', value: OTHER_BUCKET_VALUE }],
          color: getOtherBucketColor(isDarkMode),
          touched: false,
        },
      ],
    };
  }
  return config;
};

export const withoutOtherBucketAssignment = (config: ColorMapping.Config): ColorMapping.Config => {
  return {
    ...config,
    assignments: config.assignments.filter(
      (assignment) => !assignment.rules.some(isOtherBucketRule)
    ),
  };
};

export const getOtherBucketColor = (isDarkMode: boolean): ColorMapping.CategoricalColor => ({
  type: 'categorical',
  paletteId: KbnPalette.Neutral,
  colorIndex: isDarkMode ? DEFAULT_NEUTRAL_DARK_MODE_PALETTE_INDEX : DEFAULT_NEUTRAL_PALETTE_INDEX,
});

/**
 * The default color mapping used in Kibana, starts with the EUI color palette
 */
export const DEFAULT_COLOR_MAPPING_CONFIG: ColorMapping.Config = {
  assignments: [],
  specialAssignments: [DEFAULT_OTHER_ASSIGNMENT],
  paletteId: KbnPalette.Default,
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

    const otherColor = getOtherAssignmentColor(specialAssignments, assignments);
    const otherColors = otherColor.isLoop
      ? Array.from({ length: palette.colorCount }, (d, i) => palette.getColor(i))
      : [getColor(otherColor.color, palettes)];
    return [
      ...assignments.map((a) => {
        return a.color.type === 'gradient' ? '' : getColor(a.color, palettes);
      }),
      ...otherColors,
    ].filter((color) => color !== '');
  }
}
