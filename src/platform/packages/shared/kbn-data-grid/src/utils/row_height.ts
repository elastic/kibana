/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { euiFontSize, mathWithUnits } from '@elastic/eui';
import type { DataGridStyle } from '../types';

type FontSizeKey = NonNullable<DataGridStyle['fontSize']>;
type CellPaddingKey = NonNullable<DataGridStyle['cellPadding']>;

interface LinesRowHeightParams {
  lineCount: number;
  fontSize: FontSizeKey;
  cellPadding: CellPaddingKey;
  hasBorder: boolean;
  /** CSS line height of the cells, e.g. `'1.6em'`, `'20px'` or `'1.5'`. */
  lineHeight?: string;
}

const toPx = (value: string | number | undefined): number =>
  typeof value === 'number' ? value : parseFloat(value ?? '') || 0;

// Matches the font sizes and line heights in `styles.ts`, which follow the ones of EuiDataGrid.
const getFontMetrics = (themeContext: UseEuiTheme, fontSize: FontSizeKey) => {
  if (fontSize === 's') {
    const { fontSize: size, lineHeight } = euiFontSize(themeContext, 'xs', { unit: 'px' });
    return { fontSizePx: toPx(size), lineHeightPx: toPx(lineHeight) };
  }
  return {
    fontSizePx: toPx(euiFontSize(themeContext, 's', { unit: 'px' }).fontSize),
    lineHeightPx: toPx(euiFontSize(themeContext, 'm', { unit: 'px' }).lineHeight),
  };
};

const getLineHeightPx = (lineHeight: string, fontSizePx: number): number | undefined => {
  const value = parseFloat(lineHeight);
  if (Number.isNaN(value)) {
    return undefined;
  }
  if (lineHeight.endsWith('px')) {
    return value;
  }
  // `em` and unitless line heights are relative to the font size.
  return lineHeight.endsWith('em') || /^[\d.]+$/.test(lineHeight.trim())
    ? value * fontSizePx
    : undefined;
};

/**
 * Height in pixels of a row that shows `lineCount` lines of text, used to estimate the rows before
 * they are measured.
 */
export const getLinesRowHeight = (
  themeContext: UseEuiTheme,
  { lineCount, fontSize, cellPadding, hasBorder, lineHeight }: LinesRowHeightParams
): number => {
  const { euiTheme } = themeContext;
  const { fontSizePx, lineHeightPx: themeLineHeightPx } = getFontMetrics(themeContext, fontSize);
  const lineHeightPx =
    (lineHeight === undefined ? undefined : getLineHeightPx(lineHeight, fontSizePx)) ??
    themeLineHeightPx;
  const paddingPx = toPx(
    {
      s: euiTheme.size.xs,
      m: mathWithUnits(euiTheme.size.m, (size) => size / 2),
      l: euiTheme.size.s,
    }[cellPadding]
  );
  const borderPx = hasBorder ? toPx(euiTheme.border.width.thin) : 0;
  return Math.ceil(lineCount * lineHeightPx + paddingPx * 2 + borderPx);
};
