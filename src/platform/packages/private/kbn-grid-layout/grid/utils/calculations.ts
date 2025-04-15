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

const getHeaderHeight = (row: GridRowData) => (row?.isCollapsible ? COLLAPSIBLE_HEADER_HEIGHT : 0);

export const getRowHeight = (row?: GridRowData) => {
  if (!row) return 0;
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
  if (rowId === 'third'){
    console.log(layout)
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
  const rowRef = gridLayoutStateManager.rowDimensionsRefs.current[rowId];
  if (rowRef) {
    const { top, bottom, left, right } = rowRef.getBoundingClientRect();
    return {
      top,
      bottom,
      left,
      right,
    };
  }

  const headerRef = gridLayoutStateManager.headerRefs.current[rowId];
  if (headerRef) {
    const { top, bottom, left, right } = headerRef.getBoundingClientRect();
    return {
      top,
      bottom,
      left,
      right,
    };
  }
  const currentLayout =
    gridLayoutStateManager.proposedGridLayout$.getValue() ??
    gridLayoutStateManager.gridLayout$.getValue();
  const row = currentLayout[rowId].order;
  const previousRowId = Object.values(currentLayout).find((value) => {
    return value.order === row - 1;
  })?.id;
  if (!previousRowId) {
    return {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    };
  }
  const previousRowHeaderRef = gridLayoutStateManager.headerRefs.current[previousRowId];
  if (!previousRowHeaderRef) {
    return {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    };
  }
  const { bottom, left, right } = previousRowHeaderRef.getBoundingClientRect();
  return {
    top: bottom,
    bottom,
    left,
    right,
  };

  // const top = headerRef.getBoundingClientRect().top;
};
