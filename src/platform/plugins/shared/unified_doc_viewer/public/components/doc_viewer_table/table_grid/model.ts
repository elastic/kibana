/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';

export type TableGridColumnId = string;
export type TableGridRowId = string;

export interface TableGridCellAddress {
  rowId: TableGridRowId;
  columnId: TableGridColumnId;
}

export interface TableGridCellContext<TRow> extends TableGridCellAddress {
  row: TRow;
}

export type TableGridCellActionIcon = 'add' | 'copy' | 'filter' | 'remove' | 'subtract';

export interface TableGridCellAction {
  id: string;
  label: string;
  icon: TableGridCellActionIcon;
  dataTestSubj: string;
  onExecute: () => void;
}

export interface TableGridCellActionDefinition<TRow> {
  id: string;
  resolve: (context: TableGridCellContext<TRow>) => TableGridCellAction | undefined;
}

export interface TableGridColumn<TRow> {
  id: TableGridColumnId;
  label: string;
  initialWidth?: number;
  visibleCellActions?: number;
  actions?: readonly TableGridCellActionDefinition<TRow>[];
  renderCell: (context: TableGridCellContext<TRow>) => ReactNode;
  renderDetails: (context: TableGridCellContext<TRow>) => ReactNode;
  getDetailsWarning?: (context: TableGridCellContext<TRow>) => string | undefined;
}

export interface TableGridControlCellContext<TRow> extends TableGridCellContext<TRow> {
  requestFocus: (address: TableGridCellAddress) => void;
}

export interface TableGridControlColumn<TRow> {
  id: TableGridColumnId;
  label: string;
  width: number;
  renderCell: (context: TableGridControlCellContext<TRow>) => ReactNode;
}

export interface TableGridAppearance {
  border: 'horizontal' | 'none';
  stripes: boolean;
  rowHover: 'highlight' | 'none';
  header: 'underline' | 'shade';
}

export interface TableGridScrollState {
  initialTop: number;
  onChange: (scrollTop: number) => void;
}

export interface TableGridModel<TRow> {
  id: string;
  ariaLabel: string;
  rows: readonly TRow[];
  getRowId: (row: TRow) => TableGridRowId;
  columns: readonly TableGridColumn<TRow>[];
  leadingControlColumns: readonly TableGridControlColumn<TRow>[];
  appearance: TableGridAppearance;
  headerVisibility?: boolean;
  rowHeight: 'auto';
  scroll: TableGridScrollState;
}
