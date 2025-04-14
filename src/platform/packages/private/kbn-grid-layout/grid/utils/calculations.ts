/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { GridLayoutData, GridRowData } from '../types';

export const COLLAPSIBLE_HEADER_HEIGHT = 2;

const getHeaderHeight = (row: GridRowData) => (row.isCollapsible ? COLLAPSIBLE_HEADER_HEIGHT : 0);

export const getRowHeight = (row: GridRowData) => {
  // for the elements build like:
  // {id: '10', row: 58, column: 0, width: 24, height: 11}
  // we need to find the element that has the highest row + height value
  if (row.isCollapsed) return 2;
  const panelsHeight = Object.values(row.panels).reduce((acc, panel) => {
    const panelEnd = panel.row + panel.height;
    if (!acc) return panelEnd;
    return Math.max(acc, panelEnd);
  }, 0);
  return panelsHeight + getHeaderHeight(row);
};

export const getTopOffsetForRow = (
  rowId: string,
  layout: GridLayoutData,
  shouldCountHeader?: boolean
) => {
  // get all the rows before the current row using the order property
  const rowsBefore = Object.values(layout).filter((row) => row.order < layout[rowId].order);
  // get the height of all the rows before the current row
  const rowsBeforeHeight = rowsBefore.reduce((acc, row) => {
    return acc + getRowHeight(row);
  }, 0);

  return rowsBeforeHeight + (shouldCountHeader ? getHeaderHeight(layout[rowId]) : 0);
};

export const getTopOffsetForRowFooter = (rowId: string, layout: GridLayoutData) => {
  // get all the rows before the current row using the order property
  const rowsBefore = Object.values(layout).filter((row) => row.order <= layout[rowId].order);
  // get the height of all the rows before the current row
  const rowsBeforeHeight = rowsBefore.reduce((acc, row) => {
    return acc + getRowHeight(row);
  }, 0);
  return rowsBeforeHeight;
};
