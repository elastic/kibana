/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ColorMapping } from '.';
import { getPalette } from '../palettes';

export function updateAssignmentsPalette(
  assignments: ColorMapping.Config['assignments'],
  colorMode: ColorMapping.Config['colorMode'],
  paletteId: string,
  getPaletteFn: ReturnType<typeof getPalette>,
  preserveColorChanges: boolean
): ColorMapping.Config['assignments'] {
  const palette = getPaletteFn(paletteId);
  return assignments.map(({ rule, color, touched }, index) => {
    if (preserveColorChanges && touched) {
      return { rule, color, touched };
    } else {
      const newColor: ColorMapping.Config['assignments'][number]['color'] =
        colorMode.type === 'categorical'
          ? {
              type: 'categorical',
              paletteId,
              colorIndex: index % palette.colorCount,
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
