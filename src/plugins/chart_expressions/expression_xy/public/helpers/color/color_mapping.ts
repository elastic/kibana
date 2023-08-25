/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SeriesColorAccessorFn } from '@elastic/charts';
import { getColorFactory, type ColorMapping, type ColorMappingInputData } from '@kbn/coloring';
export const MULTI_FIELD_VALUES_SEPARATOR = ' › ';
export function getColorSeriesAccessorFn(
  model: ColorMapping.Config,
  getPaletteFn: (paletteId: string) => ColorMapping.CategoricalPalette,
  isDarkMode: boolean,
  mappingData: ColorMappingInputData,
  fieldId: string
): SeriesColorAccessorFn {
  const specialHandlingInverse: Map<string, string> =
    mappingData.type === 'categories'
      ? new Map([...mappingData.specialHandling.entries()].map((d) => [d[1], d[0]]))
      : new Map();
  const getColor = getColorFactory(model, getPaletteFn, isDarkMode, mappingData);
  return ({ splitAccessors }) => {
    const category = splitAccessors.get(fieldId);
    if (category === undefined) {
      return 'red';
    }
    const stringCategory = `${category}`;
    // if the separator exist, we are de-constructing a multifieldkey into values.
    const categoryForColor = stringCategory.includes(MULTI_FIELD_VALUES_SEPARATOR)
      ? stringCategory.split(MULTI_FIELD_VALUES_SEPARATOR).map((c) => {
          const trimmedValue = c.trim();
          return specialHandlingInverse.get(trimmedValue) ?? trimmedValue;
        })
      : specialHandlingInverse.get(stringCategory) ?? stringCategory;

    return getColor(categoryForColor);
  };
}
