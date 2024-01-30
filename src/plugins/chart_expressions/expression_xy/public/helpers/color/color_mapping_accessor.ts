/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SeriesColorAccessorFn } from '@elastic/charts';
import { getColorFactory, type ColorMapping, type ColorMappingInputData } from '@kbn/coloring';
import { MULTI_FIELD_KEY_SEPARATOR } from '@kbn/data-plugin/common';

/**
 * Return a color accessor function for XY charts depending on the split accessors received.
 */
export function getColorSeriesAccessorFn(
  config: ColorMapping.Config,
  getPaletteFn: (paletteId: string) => ColorMapping.CategoricalPalette,
  isDarkMode: boolean,
  mappingData: ColorMappingInputData,
  fieldId: string,
  specialTokens: Map<string, string>
): SeriesColorAccessorFn {
  // inverse map to handle the conversion between the formatted string and their original format
  // for any specified special tokens
  const specialHandlingInverseMap: Map<string, string> = new Map(
    [...specialTokens.entries()].map((d) => [d[1], d[0]])
  );

  const getColor = getColorFactory(config, getPaletteFn, isDarkMode, mappingData);

  return ({ splitAccessors }) => {
    const splitValue = splitAccessors.get(fieldId);
    // if there isn't a category associated in the split accessor, let's use the default color
    if (splitValue === undefined) {
      return null;
    }

    // category can be also a number, range, ip, multi-field. We need to stringify it to be sure
    // we can correctly match it a with user string
    // if the separator exist, we de-construct it into a multifieldkey into values.
    const categories = `${splitValue}`.split(MULTI_FIELD_KEY_SEPARATOR).map((category) => {
      return specialHandlingInverseMap.get(category) ?? category;
    });
    // we must keep the array nature of a multi-field key or just use a single string
    // This is required because the rule stored are checked differently for single values or multi-values
    return getColor(categories.length > 1 ? categories : categories[0]);
  };
}
