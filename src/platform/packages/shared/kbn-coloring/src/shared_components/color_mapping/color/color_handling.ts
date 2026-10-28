/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chroma from 'chroma-js';
import type { KbnPaletteId, KbnPalettes } from '@kbn/palettes';
import { KbnPalette } from '@kbn/palettes';
import type { RawValue, SerializedValue } from '@kbn/data-plugin/common';
import { deserializeField } from '@kbn/data-plugin/common';
import type { ColorMapping } from '../config';
import { changeAlpha, combineColors, getValidColor } from './color_math';
import type { ColorMappingInputData } from '../categorical_color_mapping';
import type { GradientColorMode } from '../config/types';
import { DEFAULT_NEUTRAL_PALETTE_INDEX } from '../config/default_color_mapping';
import { getColorAssignmentMatcher } from './color_assignment_matcher';
import { getValueKey } from './utils';
import { getOtherAssignmentColor } from '../config/utils';

const FALLBACK_ASSIGNMENT_COLOR = 'red';

/**
 * Returns the color at `colorIndex` of the palette `paletteId`
 */
export type PaletteColorLookup = (paletteId: KbnPaletteId, colorIndex: number) => string;

const uncachedPaletteColorLookup =
  (palettes: KbnPalettes): PaletteColorLookup =>
  (paletteId, colorIndex) =>
    palettes.get(paletteId).getColor(colorIndex);

/**
 * Returns a palette color lookup that generates each palette's colors only once, for as long as the
 * lookup is referenced. Palette `getColor` regenerates all colors on every call, which is costly when a
 * chart asks for a color per series.
 */
function cachedPaletteColorLookup(palettes: KbnPalettes): PaletteColorLookup {
  const colorsByPaletteId = new Map<KbnPaletteId, string[]>();
  return (paletteId, colorIndex) => {
    let colors = colorsByPaletteId.get(paletteId);
    if (!colors) {
      colors = palettes.get(paletteId).colors();
      colorsByPaletteId.set(paletteId, colors);
    }
    return colors[colorIndex % colors.length];
  };
}

export function getAssignmentColor(
  colorMode: ColorMapping.Config['colorMode'],
  color:
    | ColorMapping.Assignment['color']
    | (ColorMapping.LoopColor & { paletteId: KbnPaletteId; colorIndex: number }),
  palettes: KbnPalettes,
  isDarkMode: boolean,
  index: number,
  total: number,
  paletteColor: PaletteColorLookup = uncachedPaletteColorLookup(palettes)
): string {
  switch (color.type) {
    case 'colorCode':
    case 'categorical':
    case 'loop':
      return getColor(color, palettes, paletteColor);
    case 'gradient': {
      if (colorMode.type === 'categorical') {
        return FALLBACK_ASSIGNMENT_COLOR;
      }
      const colorScale = getGradientColorScale(colorMode, palettes, isDarkMode);
      return total === 0
        ? FALLBACK_ASSIGNMENT_COLOR
        : total === 1
        ? colorScale(0)
        : colorScale(index / (total - 1));
    }
    default:
      return FALLBACK_ASSIGNMENT_COLOR;
  }
}

export function getColor(
  color:
    | ColorMapping.ColorCode
    | ColorMapping.CategoricalColor
    | (ColorMapping.LoopColor & { paletteId: KbnPaletteId; colorIndex: number }),
  palettes: KbnPalettes,
  paletteColor: PaletteColorLookup = uncachedPaletteColorLookup(palettes)
): string {
  return color.type === 'colorCode'
    ? color.colorCode
    : getValidColor(paletteColor(color.paletteId, color.colorIndex)).hex();
}

/**
 * Returns a color given a raw value
 */
export type ColorHandlingFn = (rawValue: RawValue) => string;

export function getColorFactory(
  { assignments, specialAssignments, colorMode, paletteId }: ColorMapping.Config,
  palettes: KbnPalettes,
  isDarkMode: boolean,
  data: ColorMappingInputData
): ColorHandlingFn {
  const lastCategorical = assignments.findLast(({ color }) => color.type === 'categorical');
  const nextCategoricalIndex =
    lastCategorical?.color.type === 'categorical' ? lastCategorical.color.colorIndex + 1 : 0;

  const autoAssignments = assignments
    .filter(({ rules }) => rules.length === 0)
    .map((assignment, i) => ({
      assignment,
      assignmentIndex: i,
    }));

  const assignmentMatcher = getColorAssignmentMatcher(assignments);
  // The returned function is called per category (e.g. per chart series): generate each palette's colors once
  const paletteColor = cachedPaletteColorLookup(palettes);
  // find all categories that don't match with an assignment
  const unassignedAutoAssignmentsMap = new Map(
    data.type === 'categories'
      ? data.categories // data.categories contains the serialized values
          .map((category: SerializedValue) => deserializeField(category)) // convert to rawValues/instances like MultiFieldKey etc
          .filter((category: RawValue) => {
            // remove categories one maching an assignment
            return !assignmentMatcher.hasMatch(category);
          })
          // setting the Map keys as the stringified version of the rawValue
          .map((category: RawValue, i) => {
            const key = getValueKey(category);
            const autoAssignment = autoAssignments[i];
            return [key, { ...autoAssignment, categoryIndex: i }];
          })
      : []
  );

  return (rawValue: RawValue) => {
    const key = getValueKey(rawValue);

    if (unassignedAutoAssignmentsMap.has(key)) {
      const {
        assignment,
        assignmentIndex = -1,
        categoryIndex = -1,
      } = unassignedAutoAssignmentsMap.get(key) ?? {};

      if (assignment) {
        // the category is within the number of available auto-assignments
        return getAssignmentColor(
          colorMode,
          assignment.color,
          palettes,
          isDarkMode,
          assignmentIndex,
          assignments.length,
          paletteColor
        );
      }

      // the category is not assigned to a specific color
      const totalColorsIfGradient = assignments.length || unassignedAutoAssignmentsMap.size;
      const indexIfGradient = (categoryIndex - autoAssignments.length) % totalColorsIfGradient;

      const otherColor = getOtherAssignmentColor(specialAssignments, assignments);
      // if no auto-assign color rule/color is available then use the color looping palette
      return getAssignmentColor(
        colorMode,
        otherColor.isLoop
          ? colorMode.type === 'gradient'
            ? { type: 'gradient' }
            : {
                type: 'loop',
                // those are applied here and depends on the current non-assigned category - auto-assignment list
                colorIndex: categoryIndex - autoAssignments.length + nextCategoricalIndex,
                paletteId,
              }
          : otherColor.color,
        palettes,
        isDarkMode,
        indexIfGradient,
        totalColorsIfGradient,
        paletteColor
      );
    }

    // find the assignment where the category matches the rule
    const matchingAssignmentIndex = assignmentMatcher.getIndex(rawValue);

    if (matchingAssignmentIndex > -1) {
      const assignment = assignments[matchingAssignmentIndex];
      return getAssignmentColor(
        colorMode,
        assignment.color,
        palettes,
        isDarkMode,
        matchingAssignmentIndex,
        assignments.length,
        paletteColor
      );
    }
    return getColor(
      {
        type: 'categorical',
        paletteId: KbnPalette.Neutral,
        colorIndex: DEFAULT_NEUTRAL_PALETTE_INDEX,
      },
      palettes,
      paletteColor
    );
  };
}

export function getGradientColorScale(
  colorMode: GradientColorMode,
  palettes: KbnPalettes,
  isDarkMode: boolean
): (value: number) => string {
  const steps =
    colorMode.steps.length === 1
      ? [
          getColor(colorMode.steps[0], palettes),
          combineColors(
            changeAlpha(getColor(colorMode.steps[0], palettes), 0.3),
            isDarkMode ? 'black' : 'white'
          ),
        ]
      : colorMode.steps.map((d) => getColor(d, palettes));
  if (colorMode.sort === 'asc') steps.reverse();
  const scale = chroma.scale(steps).mode('lab');
  return (value: number) => scale(value).hex();
}
