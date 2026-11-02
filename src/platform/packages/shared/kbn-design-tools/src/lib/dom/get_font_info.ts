/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { roundPxValue } from './round_px_value';

export interface FontInfo {
  fontFamily: string;
  resolvedFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
}

const formatPxValue = (value: string): string =>
  value.includes('px') ? roundPxValue(value) : value;

const resolveFirstFontFamily = (fontFamily: string): string => {
  const trimmed = fontFamily.trim();
  if (trimmed.length === 0) {
    return '';
  }

  let i = 0;
  const len = trimmed.length;
  while (i < len) {
    const char = trimmed[i];
    if (char === '"' || char === "'") {
      const quote = char;
      i += 1;
      const start = i;
      while (i < len && trimmed[i] !== quote) {
        i += 1;
      }
      return trimmed.slice(start, i);
    }
    if (char === ',') {
      return trimmed.slice(0, i).trim();
    }
    i += 1;
  }
  return trimmed;
};

export const getFontInfo = (element: HTMLElement): FontInfo => {
  const computed = getComputedStyle(element);
  const fontFamily = computed.fontFamily;

  return {
    fontFamily,
    resolvedFamily: resolveFirstFontFamily(fontFamily),
    fontSize: formatPxValue(computed.fontSize),
    fontWeight: computed.fontWeight,
    lineHeight: formatPxValue(computed.lineHeight),
    letterSpacing: formatPxValue(computed.letterSpacing),
  };
};
