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

export const calculateColumnLayout = (
  config: LayoutConfig,
  viewportWidth: number
): ColumnLayout => {
  if (config.alignType === 'stretch') {
    const availableWidth = viewportWidth - 2 * config.marginSize;
    const totalGutterWidth = config.gutterSize * (config.count - 1);
    return {
      columnWidth: (availableWidth - totalGutterWidth) / config.count,
      offsetLeft: config.marginSize,
    };
  }

  const columnWidth = config.width > 0 ? config.width : 100;
  const totalWidth = config.count * columnWidth + (config.count - 1) * config.gutterSize;

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

export const calculateRowLayout = (config: LayoutConfig, viewportHeight: number): RowLayout => {
  if (config.rowAlignType === 'stretch') {
    const available = viewportHeight - 2 * config.marginSize;
    const totalGutter = config.gutterSize * (config.count - 1);
    return {
      rowHeight: (available - totalGutter) / config.count,
      offsetTop: config.marginSize,
    };
  }

  const rowHeight = config.height > 0 ? config.height : 100;
  const totalHeight = config.count * rowHeight + (config.count - 1) * config.gutterSize;

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
