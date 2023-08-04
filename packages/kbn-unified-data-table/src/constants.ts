/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { EuiDataGridStyle } from '@elastic/eui';

export const DEFAULT_ROWS_PER_PAGE = 100;
export const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, DEFAULT_ROWS_PER_PAGE, 250, 500];

export const defaultMonacoEditorWidth = 370;
export const defaultTimeColumnWidth = 210;
export const kibanaJSON = 'kibana-json';

export const GRID_STYLE = {
  border: 'all',
  fontSize: 's',
  cellPadding: 's',
  rowHover: 'none',
} as EuiDataGridStyle;

export const toolbarVisibility = {
  showColumnSelector: {
    allowHide: false,
    allowReorder: true,
  },
};
