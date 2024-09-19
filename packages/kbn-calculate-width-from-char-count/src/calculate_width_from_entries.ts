/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LIMITS, calculateWidthFromCharCount } from './calculate_width_from_char_count';

type GenericObject<T = Record<string, any>> = T;

const getMaxLabelLengthForObjects = (
  entries: GenericObject[],
  labelKeys: Array<keyof GenericObject>
) =>
  entries.reduce((acc, curr) => {
    const labelKey = labelKeys.find((key) => curr[key]);
    if (!labelKey) {
      return acc;
    }
    const labelLength = curr[labelKey].length;
    return acc > labelLength ? acc : labelLength;
  }, 0);

const getMaxLabelLengthForStrings = (arr: string[]) =>
  arr.reduce((acc, curr) => (acc > curr.length ? acc : curr.length), 0);

export function calculateWidthFromEntries(
  entries: GenericObject[] | string[],
  labelKeys?: Array<keyof GenericObject>,
  overridesPanelWidths?: Partial<LIMITS>
) {
  const maxLabelLength = labelKeys
    ? getMaxLabelLengthForObjects(entries as GenericObject[], labelKeys)
    : getMaxLabelLengthForStrings(entries as string[]);

  return calculateWidthFromCharCount(maxLabelLength, overridesPanelWidths);
}
