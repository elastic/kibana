/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Columns without a width never get narrower than this, the grid scrolls horizontally instead. */
export const MIN_FILL_COLUMN_WIDTH = 100;
export const COLUMN_OVERSCAN = 3;
export const DEFAULT_ESTIMATED_ROW_HEIGHT = 34;
export const OVERSCAN = 5;

/**
 * Elements with this class are hidden until their row is hovered or one of its cells has focus,
 * e.g. an action that should not add visual noise to every row.
 */
export const DATA_GRID_REVEAL_ON_ROW_HOVER_CLASS = 'kbnDataGrid__revealOnRowHover';
export const DATA_GRID_ROW_CLASS = 'kbnDataGrid__row';
export const DATA_GRID_HEADER_ROW_CLASS = 'kbnDataGrid__headerRow';
export const DATA_GRID_CELL_CONTENT_CLASS = 'kbnDataGrid__cellContent';
export const DEFAULT_DATA_GRID_STYLE = {
  cellPadding: 'l',
  fontSize: 's',
  border: 'horizontal',
  stripes: true,
  rowHover: 'highlight',
  header: 'underline',
} as const;

export const CELL_EXPAND_BUTTON_TEST_SUBJ = 'euiDataGridCellExpandButton';
export const CELL_EXPANSION_POPOVER_TEST_SUBJ = 'euiDataGridExpansionPopover';
export const CELL_EXPANSION_CLOSE_TEST_SUBJ = 'docTableClosePopover';
export const CELL_ACTIONS_TRIGGER_TEST_SUBJ = 'kbnDataGridCellActionsButton';
