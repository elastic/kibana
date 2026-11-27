/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KbnPaletteId, KbnPalettes } from '@kbn/palettes';
import type { ColorMapping } from '.';

/**
 * Returns `true` when a color is a deliberate user choice: a fixed color code or a categorical color
 * drawn from a palette other than the active one.
 */
export function isColorCustomized(
  color: ColorMapping.CategoricalColor | ColorMapping.ColorCode | ColorMapping.GradientColor,
  activePaletteId: KbnPaletteId,
  palettes: KbnPalettes
): boolean {
  if (color.type !== 'categorical') {
    return true;
  }
  return palettes.get(color.paletteId).id !== palettes.get(activePaletteId).id;
}

/**
 * Returns `true` when an assignment's color is a deliberate user choice (a custom color code or a
 * color from a different palette) rather than an auto color drawn from the active palette.
 */
export function isAssignmentColorCustomized(
  assignment: ColorMapping.Assignment,
  config: ColorMapping.Config,
  palettes: KbnPalettes
): boolean {
  // Gradient mode: assignment colors are computed from `colorMode.steps` and the editor shows them
  // as read-only swatches, so they are never custom. Custom colors in this mode live on the steps.
  if (config.colorMode.type === 'gradient') {
    return false;
  }
  return isColorCustomized(assignment.color, config.paletteId, palettes);
}

/**
 * Returns `true` when any assignment or gradient step has a color that differs from the palette default.
 */
export function hasCustomColors(config: ColorMapping.Config, palettes: KbnPalettes): boolean {
  // `specialAssignments` are deliberately skipped: the default "other" color is `loop`, which
  // would always look custom, and switching palette or mode never rewrites them anyway.
  // The customizable colors are the gradient steps in gradient mode, the assignment colors in
  // categorical mode.
  const colors =
    config.colorMode.type === 'gradient'
      ? config.colorMode.steps
      : config.assignments.map((assignment) => assignment.color);

  return colors.some((color) => isColorCustomized(color, config.paletteId, palettes));
}

export function updateAssignmentsPalette(
  config: ColorMapping.Config,
  colorMode: ColorMapping.Config['colorMode'],
  paletteId: KbnPaletteId,
  palettes: KbnPalettes,
  preserveColorChanges: boolean
): ColorMapping.Config['assignments'] {
  const palette = palettes.get(paletteId);
  return config.assignments.map((assignment, index) => {
    const { rules, color } = assignment;
    if (preserveColorChanges && isAssignmentColorCustomized(assignment, config, palettes)) {
      return { rules, color };
    } else {
      const newColor: ColorMapping.Assignment['color'] =
        colorMode.type === 'categorical'
          ? {
              type: 'categorical',
              paletteId,
              colorIndex: index % palette.colors().length,
            }
          : { type: 'gradient' };
      return {
        rules,
        color: newColor,
      };
    }
  });
}

export function updateColorModePalette(
  config: ColorMapping.Config,
  paletteId: KbnPaletteId,
  preserveColorChanges: boolean,
  palettes: KbnPalettes
): ColorMapping.Config['colorMode'] {
  const { colorMode } = config;
  return colorMode.type === 'categorical'
    ? colorMode
    : {
        type: 'gradient',
        // Mirror the assignment path: on "preserve", keep only genuinely-custom steps (judged against
        // the current palette) and remap the rest to the new palette.
        steps: colorMode.steps.map((step, stepIndex) =>
          preserveColorChanges && isColorCustomized(step, config.paletteId, palettes)
            ? step
            : { type: 'categorical', paletteId, colorIndex: stepIndex }
        ),
        sort: colorMode.sort,
      };
}
