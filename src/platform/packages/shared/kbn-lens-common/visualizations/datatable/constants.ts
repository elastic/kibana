/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const LENS_DATATABLE_COLUMN = 'lens_datatable_column';
export const LENS_DATATABLE_ID = 'lnsDatatable';

export const LENS_ROW_HEIGHT_MODE = {
  auto: 'auto',
  custom: 'custom',
} as const;

// Legacy row height mode that exists in some saved objects -> maps to 'custom' with 1 line
export const LEGACY_SINGLE_ROW_HEIGHT_MODE = 'single';

export const LENS_DATAGRID_DENSITY = {
  COMPACT: 'compact',
  NORMAL: 'normal',
  EXPANDED: 'expanded',
} as const;

export const LENS_EDIT_SORT_ACTION = 'sort';
export const LENS_EDIT_RESIZE_ACTION = 'resize';
export const LENS_TOGGLE_ACTION = 'toggle';
export const LENS_EDIT_PAGESIZE_ACTION = 'pagesize';
export const DEFAULT_HEADER_ROW_HEIGHT_LINES = 3;
export const DEFAULT_HEADER_ROW_HEIGHT = LENS_ROW_HEIGHT_MODE.custom;
export const DEFAULT_ROW_HEIGHT = LENS_ROW_HEIGHT_MODE.custom;
export const DEFAULT_ROW_HEIGHT_LINES = 1;

export const ROW_HEIGHT_LINES_KEYS = {
  rowHeightLines: 'rowHeightLines',
  headerRowHeightLines: 'headerRowHeightLines',
} as const;
