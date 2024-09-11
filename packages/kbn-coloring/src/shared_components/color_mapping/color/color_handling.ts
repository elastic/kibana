/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chroma from 'chroma-js';
import { findLast } from 'lodash';
import { ColorMapping } from '../config';
import { changeAlpha, combineColors, getValidColor } from './color_math';
import { getPalette, NeutralPalette } from '../palettes';
import { ColorMappingInputData } from '../categorical_color_mapping';
import { ruleMatch } from './rule_matching';
import { GradientColorMode } from '../config/types';
import {
  DEFAULT_NEUTRAL_PALETTE_INDEX,
  DEFAULT_OTHER_ASSIGNMENT_INDEX,
} from '../config/default_color_mapping';

export function getAssignmentColor(
  colorMode: ColorMapping.Config['colorMode'],
  color:
    | ColorMapping.Config['assignments'][number]['color']
    | (ColorMapping.LoopColor & { paletteId: string; colorIndex: number }),
  getPaletteFn: ReturnType<typeof getPalette>,
  isDarkMode: boolean,
  index: number,
  total: number
): string {
  switch (color.type) {
    case 'colorCode':
    case 'categorical':
    case 'loop':
      return getColor(color, getPaletteFn, isDarkMode);
    case 'gradient': {
      if (colorMode.type === 'categorical') {
        return 'red';
      }
      const colorScale = getGradientColorScale(colorMode, getPaletteFn, isDarkMode);
      return total === 0 ? 'red' : total === 1 ? colorScale(0) : colorScale(index / (total - 1));
    }
  }
}

export function getColor(
  color:
    | ColorMapping.ColorCode
    | ColorMapping.CategoricalColor
    | (ColorMapping.LoopColor & { paletteId: string; colorIndex: number }),
  getPaletteFn: ReturnType<typeof getPalette>,
  isDarkMode: boolean
): string {
  return color.type === 'colorCode'
    ? color.colorCode
    : getValidColor(
        getPaletteFn(color.paletteId).getColor(color.colorIndex, isDarkMode, true)
      ).hex();
}

export function getColorFactory(
  { assignments, specialAssignments, colorMode, paletteId }: ColorMapping.Config,
  getPaletteFn: ReturnType<typeof getPalette>,
  isDarkMode: boolean,
  data: ColorMappingInputData
): (category: string | string[]) => string {
  // find auto-assigned colors
  const autoByOrderAssignments =
    data.type === 'categories'
      ? assignments.filter((a) => {
          return (
            a.rule.type === 'auto' || (a.rule.type === 'matchExactly' && a.rule.values.length === 0)
          );
        })
      : [];

  // find all categories that don't match with an assignment
  const notAssignedCategories =
    data.type === 'categories'
      ? data.categories.filter((category) => {
          return !assignments.some(({ rule }) => ruleMatch(rule, category));
        })
      : [];

  const lastCategorical = findLast(assignments, (d) => {
    return d.color.type === 'categorical';
  });
  const nextCategoricalIndex =
    lastCategorical?.color.type === 'categorical' ? lastCategorical.color.colorIndex + 1 : 0;

  return (category: string | string[]) => {
    if (typeof category === 'string' || Array.isArray(category)) {
      const nonAssignedCategoryIndex = notAssignedCategories.indexOf(category);

      // this category is not assigned to a specific color
      if (nonAssignedCategoryIndex > -1) {
        // if the category order is within current number of auto-assigned items pick the defined color
        if (nonAssignedCategoryIndex < autoByOrderAssignments.length) {
          const autoAssignmentIndex = assignments.findIndex(
            (d) => d === autoByOrderAssignments[nonAssignedCategoryIndex]
          );
          return getAssignmentColor(
            colorMode,
            autoByOrderAssignments[nonAssignedCategoryIndex].color,
            getPaletteFn,
            isDarkMode,
            autoAssignmentIndex,
            assignments.length
          );
        }
        const totalColorsIfGradient = assignments.length || notAssignedCategories.length;
        const indexIfGradient =
          (nonAssignedCategoryIndex - autoByOrderAssignments.length) % totalColorsIfGradient;

        // if no auto-assign color rule/color is available then use the color looping palette
        return getAssignmentColor(
          colorMode,
          // TODO: the specialAssignment[0] position is arbitrary, we should fix it better
          specialAssignments[DEFAULT_OTHER_ASSIGNMENT_INDEX].color.type === 'loop'
            ? colorMode.type === 'gradient'
              ? { type: 'gradient' }
              : {
                  type: 'loop',
                  // those are applied here and depends on the current non-assigned category - auto-assignment list
                  colorIndex:
                    nonAssignedCategoryIndex - autoByOrderAssignments.length + nextCategoricalIndex,
                  paletteId,
                }
            : specialAssignments[DEFAULT_OTHER_ASSIGNMENT_INDEX].color,
          getPaletteFn,
          isDarkMode,
          indexIfGradient,
          totalColorsIfGradient
        );
      }
    }
    // find the assignment where the category matches the rule
    const matchingAssignmentIndex = assignments.findIndex(({ rule }) => {
      return ruleMatch(rule, category);
    });

    if (matchingAssignmentIndex > -1) {
      const assignment = assignments[matchingAssignmentIndex];
      return getAssignmentColor(
        colorMode,
        assignment.color,
        getPaletteFn,
        isDarkMode,
        matchingAssignmentIndex,
        assignments.length
      );
    }
    return getColor(
      {
        type: 'categorical',
        paletteId: NeutralPalette.id,
        colorIndex: DEFAULT_NEUTRAL_PALETTE_INDEX,
      },
      getPaletteFn,
      isDarkMode
    );
  };
}

export function getGradientColorScale(
  colorMode: GradientColorMode,
  getPaletteFn: ReturnType<typeof getPalette>,
  isDarkMode: boolean
): (value: number) => string {
  const steps =
    colorMode.steps.length === 1
      ? [
          getColor(colorMode.steps[0], getPaletteFn, isDarkMode),
          combineColors(
            changeAlpha(getColor(colorMode.steps[0], getPaletteFn, isDarkMode), 0.3),
            isDarkMode ? 'black' : 'white'
          ),
        ]
      : colorMode.steps.map((d) => getColor(d, getPaletteFn, isDarkMode));
  steps.sort(() => (colorMode.sort === 'asc' ? -1 : 1));
  const scale = chroma.scale(steps).mode('lab');
  return (value: number) => scale(value).hex();
}
