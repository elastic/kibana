/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const MIN_POPOVER_CONTENT_WIDTH = 280;
const MIN_POPOVER_CHAR_COUNT = 25;
const MAX_POPOVER_CONTENT_WIDTH = 600;
const MAX_POPOVER_CHAR_COUNT = 60;

const AVERAGE_CHAR_WIDTH = 7;

function getPanelMinWidth(labelLength: number) {
  if (labelLength > MAX_POPOVER_CHAR_COUNT) {
    return MAX_POPOVER_CONTENT_WIDTH;
  }
  if (labelLength > MIN_POPOVER_CHAR_COUNT) {
    const overflownChars = labelLength - MIN_POPOVER_CHAR_COUNT;
    return MIN_POPOVER_CONTENT_WIDTH + overflownChars * AVERAGE_CHAR_WIDTH;
  }
  return MIN_POPOVER_CONTENT_WIDTH;
}

export const changeDataViewStyles = ({
  fullWidth,
  maxLabelLength,
}: {
  fullWidth?: boolean;
  maxLabelLength: number;
}) => {
  return {
    trigger: {
      maxWidth: fullWidth ? undefined : MIN_POPOVER_CONTENT_WIDTH,
    },
    popoverContent: {
      width: getPanelMinWidth(maxLabelLength),
    },
  };
};
