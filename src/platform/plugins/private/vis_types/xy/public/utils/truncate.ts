/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Average glyph width relative to tick label font size (Open Sans–like axis labels).
 */
const CHAR_WIDTH_RATIO = 0.6;

/** Default Elastic Charts axis tick label font size used for conversion. */
const DEFAULT_FONT_SIZE = 11;

/**
 * Converts character count approximate width in pixels.
 */
export const charsToPixels = (
  truncate: number | null | undefined,
  fontSize: number = DEFAULT_FONT_SIZE
): number | undefined => {
  if (truncate == null || truncate <= 0) {
    return undefined;
  }

  return Math.round(truncate * fontSize * CHAR_WIDTH_RATIO);
};
