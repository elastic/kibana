/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SeriesColorAccessorFn } from '@elastic/charts';
import {
  getColorFactory,
  getValueKey,
  type ColorMapping,
  type ColorMappingInputData,
} from '@kbn/coloring';
import type { KbnPalettes } from '@kbn/palettes';
import { MultiFieldKey, type RawValue } from '@kbn/data-plugin/common';
import type { InvertedRawValueMap } from '../data_layers';

/**
 * Return a color accessor function for XY charts depending on the split accessors received.
 */
function getRawSplitValue(
  fieldId: string,
  splitValue: string | number | null | undefined,
  invertedRawValueMap: InvertedRawValueMap
): RawValue {
  if (typeof splitValue !== 'string') {
    return splitValue;
  }

  const rawValueMap = invertedRawValueMap.get(fieldId) ?? new Map<string, RawValue>();
  return rawValueMap.has(splitValue) ? rawValueMap.get(splitValue) : splitValue;
}

export function getColorSeriesAccessorFn(
  config: ColorMapping.Config,
  invertedRawValueMap: InvertedRawValueMap,
  palettes: KbnPalettes,
  isDarkMode: boolean,
  mappingData: ColorMappingInputData,
  configuredSplitAccessors: string[]
): SeriesColorAccessorFn {
  const getColor = getColorFactory(config, palettes, isDarkMode, mappingData);

  return ({ splitAccessors }) => {
    if (configuredSplitAccessors.length > 1) {
      // if we have more then 1 split accessor we are in an ESQL multi-term context
      // we need to reconstruct back the MultiFieldKey from the original set of raw values to get the right color
      const rawValues = configuredSplitAccessors
        .map((fieldId) => {
          const splitValue = splitAccessors.get(fieldId);
          if (splitValue === undefined) return null;
          return getRawSplitValue(fieldId, splitValue, invertedRawValueMap);
        })
        .map((raw) => getValueKey(raw));
      return getColor(
        new MultiFieldKey({
          key: rawValues,
        })
      );
    }

    const fieldId = configuredSplitAccessors[0];
    const splitValue = splitAccessors.get(fieldId);
    // No category associated in the split accessor, use the default color
    if (splitValue === undefined) return null;
    const rawValue = getRawSplitValue(fieldId, splitValue, invertedRawValueMap);

    return getColor(rawValue);
  };
}
