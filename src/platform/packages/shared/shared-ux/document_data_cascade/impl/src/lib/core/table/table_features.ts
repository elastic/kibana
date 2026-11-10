/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  createExpandedRowModel,
  rowExpandingFeature,
  rowSelectionFeature,
  tableFeatures,
  type Cell,
  type CellContext,
  type Row,
  type RowData,
  type Table,
  type TableState,
} from '@tanstack/react-table';

export const cascadeTableFeatures = tableFeatures({
  rowExpandingFeature,
  expandedRowModel: createExpandedRowModel(),
  rowSelectionFeature,
});

export type CascadeTableFeatures = typeof cascadeTableFeatures;
export type CascadeTable<TData extends RowData> = Table<CascadeTableFeatures, TData>;
export type CascadeTableCell<TData extends RowData, TValue = unknown> = Cell<
  CascadeTableFeatures,
  TData,
  TValue
>;
export type CascadeTableCellContext<TData extends RowData, TValue = unknown> = CellContext<
  CascadeTableFeatures,
  TData,
  TValue
>;
export type CascadeTableRow<TData extends RowData> = Row<CascadeTableFeatures, TData>;
export type CascadeTableState = TableState<CascadeTableFeatures>;
