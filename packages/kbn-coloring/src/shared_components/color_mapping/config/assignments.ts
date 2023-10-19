/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ColorMapping } from '.';
import { MAX_ASSIGNABLE_COLORS } from '../components/container/container';
import { getPalette, NeutralPalette } from '../palettes';
import { DEFAULT_NEUTRAL_PALETTE_INDEX } from './default_color_mapping';

export function updateAssignmentsPalette(
  assignments: ColorMapping.Config['assignments'],
  assignmentMode: ColorMapping.Config['assignmentMode'],
  colorMode: ColorMapping.Config['colorMode'],
  paletteId: string,
  getPaletteFn: ReturnType<typeof getPalette>,
  preserveColorChanges: boolean
): ColorMapping.Config['assignments'] {
  const palette = getPaletteFn(paletteId);
  const maxColors = palette.type === 'categorical' ? palette.colorCount : MAX_ASSIGNABLE_COLORS;
  return assignmentMode === 'auto'
    ? []
    : assignments.map(({ rule, color, touched }, index) => {
        if (preserveColorChanges && touched) {
          return { rule, color, touched };
        } else {
          const newColor: ColorMapping.Config['assignments'][number]['color'] =
            colorMode.type === 'categorical'
              ? {
                  type: 'categorical',
                  paletteId: index < maxColors ? paletteId : NeutralPalette.id,
                  colorIndex: index < maxColors ? index : 0,
                }
              : { type: 'gradient' };
          return {
            rule,
            color: newColor,
            touched: false,
          };
        }
      });
}

export function updateColorModePalette(
  colorMode: ColorMapping.Config['colorMode'],
  paletteId: string,
  preserveColorChanges: boolean
): ColorMapping.Config['colorMode'] {
  return colorMode.type === 'categorical'
    ? colorMode
    : {
        type: 'gradient',
        steps: colorMode.steps.map((step, stepIndex) => {
          return preserveColorChanges
            ? step
            : { type: 'categorical', paletteId, colorIndex: stepIndex, touched: false };
        }),
        sort: colorMode.sort,
      };
}

export function getUnusedColorForNewAssignment(
  palette: ColorMapping.CategoricalPalette,
  colorMode: ColorMapping.Config['colorMode'],
  assignments: ColorMapping.Config['assignments']
): ColorMapping.Config['assignments'][number]['color'] {
  if (colorMode.type === 'categorical') {
    // TODO: change the type of color assignment depending on palette
    // compute the next unused color index in the palette.
    const maxColors = palette.type === 'categorical' ? palette.colorCount : MAX_ASSIGNABLE_COLORS;
    const colorIndices = new Set(Array.from({ length: maxColors }, (d, i) => i));
    assignments.forEach(({ color }) => {
      if (color.type === 'categorical' && color.paletteId === palette.id) {
        colorIndices.delete(color.colorIndex);
      }
    });
    const paletteForNextUnusedColorIndex = colorIndices.size > 0 ? palette.id : NeutralPalette.id;
    const nextUnusedColorIndex =
      colorIndices.size > 0 ? [...colorIndices][0] : DEFAULT_NEUTRAL_PALETTE_INDEX;
    return {
      type: 'categorical',
      paletteId: paletteForNextUnusedColorIndex,
      colorIndex: nextUnusedColorIndex,
    };
  } else {
    return { type: 'gradient' };
  }
}
