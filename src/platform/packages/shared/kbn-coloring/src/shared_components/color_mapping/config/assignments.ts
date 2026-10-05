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
 * Returns `true` when an assignment's color differs from the palette default for its index.
 */
export function isAssignmentColorCustomized(
  assignment: ColorMapping.Assignment,
  index: number,
  config: ColorMapping.Config,
  palettes: KbnPalettes
): boolean {
  // Gradient mode: assignment colors are computed from `colorMode.steps` and the editor
  // shows them as read-only swatches, so they are never custom. Custom colors in this mode
  // live on the steps (see `isGradientStepCustomized`).
  if (config.colorMode.type === 'gradient') {
    return false;
  }
  const { color } = assignment;
  // Categorical mode: the default is the color that `updateAssignmentsPalette` assigns.
  // A color code, a color from another palette, or a different index counts as custom.
  const palette = palettes.get(config.paletteId);
  return !(
    color.type === 'categorical' &&
    color.paletteId === config.paletteId &&
    color.colorIndex === index % palette.colors().length
  );
}

/**
 * Returns `true` when a gradient color step differs from the palette default for its index.
 */
export function isGradientStepCustomized(
  step: ColorMapping.ColorStep,
  index: number,
  paletteId: KbnPaletteId
): boolean {
  // The default step is the one `updateColorModePalette` writes on a palette reset: the
  // config palette's color at the step's position. No wrap-around, since a gradient has at
  // most 3 steps. Unlike assignments, step colors are user-editable in gradient mode.
  return !(
    step.type === 'categorical' &&
    step.paletteId === paletteId &&
    step.colorIndex === index
  );
}

/**
 * Returns `true` when any assignment or gradient step has a color that differs from the palette default.
 */
export function hasCustomColors(config: ColorMapping.Config, palettes: KbnPalettes): boolean {
  // `specialAssignments` are deliberately skipped: the default "other" color is `loop`, which
  // would always look custom, and switching palette or mode never rewrites them anyway.
  // Gradient mode: only the steps can be custom. Categorical mode: only the assignments.
  if (config.colorMode.type === 'gradient') {
    return config.colorMode.steps.some((step, index) =>
      isGradientStepCustomized(step, index, config.paletteId)
    );
  }
  return config.assignments.some((assignment, index) =>
    isAssignmentColorCustomized(assignment, index, config, palettes)
  );
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
    if (preserveColorChanges && isAssignmentColorCustomized(assignment, index, config, palettes)) {
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
  colorMode: ColorMapping.Config['colorMode'],
  paletteId: KbnPaletteId,
  preserveColorChanges: boolean
): ColorMapping.Config['colorMode'] {
  return colorMode.type === 'categorical'
    ? colorMode
    : {
        type: 'gradient',
        steps: colorMode.steps.map((step, stepIndex) => {
          return preserveColorChanges
            ? step
            : { type: 'categorical', paletteId, colorIndex: stepIndex };
        }),
        sort: colorMode.sort,
      };
}
