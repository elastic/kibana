/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ColorMapping } from '.';
import { ColorMappingInputData } from '../categorical_color_mapping';
import { MAX_ASSIGNABLE_COLORS } from '../components/container/container';

export function generateAutoAssignmentsForCategories(
  data: ColorMappingInputData,
  palette: ColorMapping.CategoricalPalette,
  colorMode: ColorMapping.Config['colorMode']
): ColorMapping.Config['assignments'] {
  const isCategorical = colorMode.type === 'categorical';

  const maxColorAssignable = data.type === 'categories' ? data.categories.length : data.bins;

  const assignableColors = isCategorical
    ? Math.min(palette.colorCount, maxColorAssignable)
    : Math.min(MAX_ASSIGNABLE_COLORS, maxColorAssignable);

  const autoRules: Array<ColorMapping.RuleMatchExactly | ColorMapping.RuleRange> =
    data.type === 'categories'
      ? data.categories.map((c) => ({ type: 'matchExactly', values: [c] }))
      : Array.from({ length: data.bins }, (d, i) => {
          const step = (data.max - data.min) / data.bins;
          return {
            type: 'range',
            min: data.max - i * step - step,
            max: data.max - i * step,
            minInclusive: true,
            maxInclusive: false,
          };
        });

  const assignments = autoRules
    .slice(0, assignableColors)
    .map<ColorMapping.Config['assignments'][number]>((rule, colorIndex) => {
      if (isCategorical) {
        return {
          rule,
          color: {
            type: 'categorical',
            paletteId: palette.id,
            colorIndex,
          },
          touched: false,
        };
      } else {
        return {
          rule,
          color: {
            type: 'gradient',
          },
          touched: false,
        };
      }
    });

  return assignments;
}
