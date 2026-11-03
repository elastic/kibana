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
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
}

const formatPxValue = (value: string): string =>
  value.includes('px') ? roundPxValue(value) : value;

export const getFontInfo = (element: HTMLElement): FontInfo => {
  const computed = getComputedStyle(element);

  return {
    fontFamily: computed.fontFamily,
    fontSize: formatPxValue(computed.fontSize),
    fontWeight: computed.fontWeight,
    lineHeight: formatPxValue(computed.lineHeight),
    letterSpacing: computed.letterSpacing,
  };
};
