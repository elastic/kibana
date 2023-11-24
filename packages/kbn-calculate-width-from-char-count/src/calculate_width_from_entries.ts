/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LIMITS, calculateWidthFromCharCount } from './calculate_width_from_char_count';

const getMaxLabelLengthForObjects = <T extends Record<string, string>>(
  entries: T[],
  labelKeys: Array<keyof T>
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

export function calculateWidthFromEntries<T extends Record<string, string>>(
  entries: T[] | string[],
  labelKeys?: Array<keyof T>,
  overridesPanelWidths?: Partial<LIMITS>
) {
  const maxLabelLength = labelKeys
    ? getMaxLabelLengthForObjects(entries as T[], labelKeys)
    : getMaxLabelLengthForStrings(entries as string[]);

  return calculateWidthFromCharCount(maxLabelLength, overridesPanelWidths);
}
