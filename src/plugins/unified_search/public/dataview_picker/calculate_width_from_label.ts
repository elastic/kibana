/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

interface PANEL_WIDTHS {
  minWidth: number;
  minWidthCharCapacity: number;
  avCharWidth: number;
  maxWidthCharCapacity: number;
  maxWidth: number;
}

const MIN_WIDTH = 300;
const MIN_WIDTH_CHAR_COUNT = 28;
const MAX_WIDTH = 550;
const MAX_WIDTH_CHAR_COUNT = 60;
const AVERAGE_CHAR_WIDTH = 7;

const defaultPanelWidths: PANEL_WIDTHS = {
  minWidth: MIN_WIDTH,
  minWidthCharCapacity: MIN_WIDTH_CHAR_COUNT,
  maxWidth: MAX_WIDTH,
  maxWidthCharCapacity: MAX_WIDTH_CHAR_COUNT,
  avCharWidth: AVERAGE_CHAR_WIDTH,
};

export function calculateWidthFromLabel(
  labelLength: number,
  overridesPanelWidths?: Partial<PANEL_WIDTHS>
) {
  const { minWidth, minWidthCharCapacity, maxWidth, maxWidthCharCapacity, avCharWidth } = {
    ...defaultPanelWidths,
    ...overridesPanelWidths,
  };

  if (labelLength > maxWidthCharCapacity) {
    return maxWidth;
  }
  if (labelLength > minWidthCharCapacity) {
    const overflownChars = labelLength - minWidthCharCapacity;
    return minWidth + overflownChars * avCharWidth;
  }
  return minWidth;
}
