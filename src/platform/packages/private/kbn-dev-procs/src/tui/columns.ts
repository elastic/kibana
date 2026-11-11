/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SettingRow } from '../settings/types';

const ELLIPSIS = '…';
const KEY_SHARE = 0.55;
const VALUE_SHARE = 0.25;

/**
 * Pads or shortens `text` to exactly `width` characters. `middle` keeps both ends, which suits setting keys: the
 * namespace and the setting name stay readable.
 */
export const fitText = (text: string, width: number, cut: 'middle' | 'end'): string => {
  if (width <= 0) {
    return '';
  }
  if (text.length <= width) {
    return text.padEnd(width);
  }
  if (width === 1) {
    return ELLIPSIS;
  }
  if (cut === 'end') {
    return `${text.slice(0, width - 1)}${ELLIPSIS}`;
  }
  const head = Math.ceil((width - 1) / 2);
  const tail = width - 1 - head;
  return `${text.slice(0, head)}${ELLIPSIS}${tail > 0 ? text.slice(-tail) : ''}`;
};

export interface ColumnWidths {
  readonly key: number;
  readonly value: number;
}

/**
 * Column widths for a list of settings in a pane `width` characters wide. They come from every row, not only the
 * visible ones, so the columns stay put while scrolling, and they leave room for the columns after them.
 */
export const getColumnWidths = (rows: readonly SettingRow[], width: number): ColumnWidths => {
  const longest = (texts: ReadonlyArray<string | undefined>) =>
    Math.max(0, ...texts.map((text) => text?.length ?? 0));
  return {
    key: Math.min(longest(rows.map(({ key }) => key)), Math.max(Math.floor(width * KEY_SHARE), 1)),
    value: Math.min(longest(rows.map(({ value }) => value)), Math.floor(width * VALUE_SHARE)),
  };
};
