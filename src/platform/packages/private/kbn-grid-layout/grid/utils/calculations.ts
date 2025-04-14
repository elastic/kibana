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
  const headerHeight = getHeaderHeight(row);
  if (row.isCollapsed) return headerHeight;
  const panelsHeight = Object.values(row.panels).reduce(
    (acc, panel) => Math.max(acc, panel.row + panel.height),
    0
  );
  return panelsHeight + headerHeight;
};

export const getTopOffsetForRow = (
  rowId: string,
  layout: GridLayoutData,
  shouldCountHeader?: boolean
) => {
  const rowsBeforeHeight = Object.values(layout)
    .filter((row) => row.order < layout[rowId].order)
    .reduce((acc, row) => acc + getRowHeight(row), 0);

  return rowsBeforeHeight + (shouldCountHeader ? getHeaderHeight(layout[rowId]) : 0);
};
