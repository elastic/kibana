/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SeriesColorAccessorFn } from '@elastic/charts';
import { getColorFactory, type ColorMapping, type ColorMappingInputData } from '@kbn/coloring';
import { KbnPalettes } from '@kbn/palettes';
import { InvertedRawValueMap } from '../data_layers';

/**
 * Return a color accessor function for XY charts depending on the split accessors received.
 */
export function getColorSeriesAccessorFn(
  config: ColorMapping.Config,
  invertedRawValueMap: InvertedRawValueMap,
  palettes: KbnPalettes,
  isDarkMode: boolean,
  mappingData: ColorMappingInputData,
  fieldId: string
): SeriesColorAccessorFn {
  const getColor = getColorFactory(config, palettes, isDarkMode, mappingData);
  const rawValueMap = invertedRawValueMap.get(fieldId) ?? new Map<string, unknown>();

  return ({ splitAccessors }) => {
    const splitValue = splitAccessors.get(fieldId);

    // No category associated in the split accessor, use the default color
    if (splitValue === undefined) return null;

    const rawValue =
      typeof splitValue === 'string' ? rawValueMap.get(splitValue) ?? splitValue : splitValue;

    return getColor(rawValue);
  };
}
