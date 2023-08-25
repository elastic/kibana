/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { scaleSequential } from 'd3-scale';
import { interpolateHsl, piecewise } from 'd3-interpolate';
import { ColorMapping } from '../config';
import { changeAlpha } from './color_math';
import { generateAutoAssignmentsForCategories } from '../config/assignment_from_categories';
import { getPalette } from '../palette';
import { ColorMappingInputData } from '../categorical_color_mapping';
import { ruleMatch } from './rule_matching';

export type Color = string;

export function getAssignmentColor(
  colorMode: ColorMapping.Config['colorMode'],
  color: ColorMapping.Config['assignments'][number]['color'],
  getPaletteFn: ReturnType<typeof getPalette>,
  isDarkMode: boolean,
  index: number,
  total: number
) {
  switch (color.type) {
    case 'colorCode':
    case 'categorical':
      return getColor(color, getPaletteFn, isDarkMode);
    case 'gradient': {
      if (colorMode.type === 'categorical') {
        return 'red';
      }
      const steps =
        colorMode.steps.length === 1
          ? [
              // TODO: change lumisonity instead of alpha
              changeAlpha(getColor(colorMode.steps[0], getPaletteFn, isDarkMode), 1),
              changeAlpha(getColor(colorMode.steps[0], getPaletteFn, isDarkMode), 0.3),
            ]
          : colorMode.steps.map((d) => getColor(d, getPaletteFn, isDarkMode));
      steps.sort(() => (colorMode.sort === 'asc' ? -1 : 1));
      const colorScale = scaleSequential(piecewise(interpolateHsl, steps));
      return colorScale(index / total);
    }
  }
}

export function getColor(
  color: ColorMapping.ColorCode | ColorMapping.CategoricalColor,
  getPaletteFn: ReturnType<typeof getPalette>,
  isDarkMode: boolean
) {
  switch (color.type) {
    case 'colorCode':
      return color.colorCode;
    case 'categorical':
      return getPaletteFn(color.paletteId).getColor(color.colorIndex, isDarkMode);
  }
}

export function getColorFactory(
  model: ColorMapping.Config,
  getPaletteFn: ReturnType<typeof getPalette>,
  isDarkMode: boolean,
  data: ColorMappingInputData
): (category: string | number | string[]) => Color {
  const palette = getPaletteFn(model.paletteId);
  // generate on-the-fly assignments in auto-mode based on current data.
  // This simplify the code by always using assignments, even if there is no real static assigmnets
  const assignments =
    model.assignmentMode === 'auto'
      ? generateAutoAssignmentsForCategories(data, palette, model.colorMode)
      : model.assignments;

  // find auto-assigned colors
  const autoAssignedColors =
    data.type === 'categories'
      ? assignments.filter((a) => {
          return (
            a.rule.type === 'auto' || (a.rule.type === 'matchExactly' && a.rule.values.length === 0)
          );
        })
      : [];

  // find all categories that doesn't match with an assignment
  const nonAssignedCategories =
    data.type === 'categories'
      ? data.categories.filter((category) => {
          return !assignments.some(({ rule }) => ruleMatch(rule, category));
        })
      : [];

  // TODO: check if number type is needed here
  return (category: string | number | string[]) => {
    if (typeof category === 'string' || Array.isArray(category)) {
      const nonAssignedCategoryIndex = nonAssignedCategories.indexOf(category);

      // return color for a non assigned category
      if (nonAssignedCategoryIndex > -1) {
        if (nonAssignedCategoryIndex < autoAssignedColors.length) {
          const autoAssignmentIndex = assignments.findIndex(
            (d) => d === autoAssignedColors[nonAssignedCategoryIndex]
          );
          return getAssignmentColor(
            model.colorMode,
            autoAssignedColors[nonAssignedCategoryIndex].color,
            getPaletteFn,
            isDarkMode,
            autoAssignmentIndex,
            assignments.length - 1
          );
        }
        // if no auto-assign color rule/color is available then use the other color
        // TODO: the specialAssignment[0] position is arbitrary, we should fix it better
        return getColor(model.specialAssignments[0].color, getPaletteFn, isDarkMode);
      }

      // find the assignment where the category matches the rule
      const matchingAssignmentIndex = assignments.findIndex(({ rule }) => {
        return ruleMatch(rule, category);
      });

      // return the assigned color
      if (matchingAssignmentIndex > -1) {
        const assignment = assignments[matchingAssignmentIndex];
        return getAssignmentColor(
          model.colorMode,
          assignment.color,
          getPaletteFn,
          isDarkMode,
          matchingAssignmentIndex,
          assignments.length - 1
        );
      }
      // if no assign color rule/color is available then use the other color
      // TODO: the specialAssignment[0] position is arbitrary, we should fix it better
      return getColor(model.specialAssignments[0].color, getPaletteFn, isDarkMode);
    } else {
      const matchingAssignmentIndex = assignments.findIndex(({ rule }) => {
        return ruleMatch(rule, category);
      });

      if (matchingAssignmentIndex > -1) {
        const assignment = assignments[matchingAssignmentIndex];
        return getAssignmentColor(
          model.colorMode,
          assignment.color,
          getPaletteFn,
          isDarkMode,
          matchingAssignmentIndex,
          assignments.length - 1
        );
      }
      return getColor(model.specialAssignments[0].color, getPaletteFn, isDarkMode);
    }
  };
}
