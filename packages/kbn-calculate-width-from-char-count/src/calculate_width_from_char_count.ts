/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface LIMITS {
  paddingsWidth: number;
  minWidth?: number;
  avCharWidth: number;
  maxWidth: number;
}

export const MAX_WIDTH = 550;
const PADDINGS_WIDTH = 116;
const AVERAGE_CHAR_WIDTH = 7;

const defaultPanelWidths: LIMITS = {
  maxWidth: MAX_WIDTH,
  avCharWidth: AVERAGE_CHAR_WIDTH,
  paddingsWidth: PADDINGS_WIDTH,
};

export function calculateWidthFromCharCount(
  labelLength: number,
  overridesPanelWidths?: Partial<LIMITS>
) {
  const { maxWidth, avCharWidth, paddingsWidth, minWidth } = {
    ...defaultPanelWidths,
    ...overridesPanelWidths,
  };
  const widthForCharCount = paddingsWidth + labelLength * avCharWidth;

  if (minWidth && widthForCharCount < minWidth) {
    return minWidth;
  }

  return Math.min(widthForCharCount, maxWidth);
}
