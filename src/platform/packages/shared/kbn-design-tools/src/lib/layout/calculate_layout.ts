/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LayoutConfig } from './layout_config';

export interface ColumnLayout {
  offsetLeft: number;
  columnWidth: number;
}

export interface RowLayout {
  offsetTop: number;
  rowHeight: number;
}

/**
 * Calculates column widths and left offset for the column layout overlay.
 *
 * @param config - The layout configuration.
 * @param viewportWidth - The current viewport width in pixels.
 * @returns The computed {@link ColumnLayout}.
 */
export const calculateColumnLayout = (
  config: LayoutConfig,
  viewportWidth: number
): ColumnLayout => {
  const count = Math.max(1, config.count);

  if (config.alignType === 'stretch') {
    const availableWidth = Math.max(0, viewportWidth - 2 * config.marginSize);
    const totalGutterWidth = config.gutterSize * (count - 1);
    const columnWidth = Math.max(0, (availableWidth - totalGutterWidth) / count);
    return {
      columnWidth,
      offsetLeft: config.marginSize,
    };
  }

  const columnWidth = config.width > 0 ? config.width : 100;
  const totalWidth = count * columnWidth + (count - 1) * config.gutterSize;

  let offsetLeft: number;
  if (config.alignType === 'center') {
    offsetLeft = (viewportWidth - totalWidth) / 2;
  } else if (config.alignType === 'left') {
    offsetLeft = config.marginSize;
  } else {
    offsetLeft = viewportWidth - totalWidth - config.marginSize;
  }

  return { columnWidth, offsetLeft };
};

/**
 * Calculates row heights and top offset for the row layout overlay.
 *
 * @param config - The layout configuration.
 * @param viewportHeight - The current viewport height in pixels.
 * @returns The computed {@link RowLayout}.
 */
export const calculateRowLayout = (config: LayoutConfig, viewportHeight: number): RowLayout => {
  const count = Math.max(1, config.count);

  if (config.rowAlignType === 'stretch') {
    const available = Math.max(0, viewportHeight - 2 * config.marginSize);
    const totalGutter = config.gutterSize * (count - 1);
    const rowHeight = Math.max(0, (available - totalGutter) / count);
    return {
      rowHeight,
      offsetTop: config.marginSize,
    };
  }

  const rowHeight = config.height > 0 ? config.height : 100;
  const totalHeight = count * rowHeight + (count - 1) * config.gutterSize;

  let offsetTop: number;
  if (config.rowAlignType === 'center') {
    offsetTop = (viewportHeight - totalHeight) / 2;
  } else if (config.rowAlignType === 'top') {
    offsetTop = config.marginSize;
  } else {
    offsetTop = viewportHeight - totalHeight - config.marginSize;
  }

  return { rowHeight, offsetTop };
};
