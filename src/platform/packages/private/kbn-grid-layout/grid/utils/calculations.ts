/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { GridLayoutData, GridLayoutStateManager, GridRowData } from '../types';

export const COLLAPSIBLE_HEADER_HEIGHT = 2;

const getHeaderHeight = (row: GridRowData) => (row.isCollapsible ? COLLAPSIBLE_HEADER_HEIGHT : 0);

export const getRowHeight = (row: GridRowData) => {
  if (row.isCollapsed) return 0;
  return Object.values(row.panels).reduce(
    (acc, panel) => Math.max(acc, panel.row + panel.height),
    0
  );
};

export const getTopOffsetForRowHeader = (rowId: string, layout: GridLayoutData) => {
  if (!layout[rowId]) {
    return 0;
  }
  const rowsBeforeHeight = Object.values(layout)
    .filter((row) => row.order < layout[rowId].order)
    .reduce((acc, row) => acc + getRowHeight(row) + getHeaderHeight(row), 0);

  return rowsBeforeHeight;
};

export const getTopOffsetForRow = (rowId: string, layout: GridLayoutData) => {
  return getTopOffsetForRowHeader(rowId, layout) + getHeaderHeight(layout[rowId]);
};

export const getRowRect = (rowId: string, gridLayoutStateManager: GridLayoutStateManager) => {
  const headerRef = gridLayoutStateManager.headerRefs.current[rowId];
  const rowRef = gridLayoutStateManager.rowDimensionsRefs.current[rowId];
  if (!headerRef) {
    throw new Error('header ref should be defined for all rows');
  }
  if (!rowRef) {
    const { top, bottom } = headerRef.getBoundingClientRect();
    return {
      top,
      bottom,
    };
  }
  const top = headerRef.getBoundingClientRect().top;
  const bottom = rowRef.getBoundingClientRect().bottom;
  return {
    top,
    bottom,
  };
};
