/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';

export interface DataGridCellContext<TRow extends object, TValue> {
  row: TRow;
  rowId: string;
  columnId: string;
  displayIndex: number;
  value: TValue;
}

export interface DataGridColumnOptions<TRow extends object, TValue> {
  id: string;
  header: ReactNode;
  accessibilityLabel: string;
  getValue: (row: TRow) => TValue;
  getAccessibilityValue: (context: DataGridCellContext<TRow, TValue>) => string;
  renderCell: (context: DataGridCellContext<TRow, TValue>) => ReactNode;
}

interface InternalDataGridCellContext<TRow extends object> {
  row: TRow;
  rowId: string;
  columnId: string;
  displayIndex: number;
}

interface InternalDataGridColumn<TRow extends object> {
  getValue: (row: TRow) => unknown;
  getAccessibilityValue: (context: InternalDataGridCellContext<TRow>, value: unknown) => string;
  renderCell: (context: InternalDataGridCellContext<TRow>, value: unknown) => ReactNode;
}

const internalColumnDefinition: unique symbol = Symbol('internalColumnDefinition');

export interface DataGridColumn<TRow extends object> {
  readonly id: string;
  readonly header: ReactNode;
  readonly accessibilityLabel: string;
  readonly [internalColumnDefinition]: InternalDataGridColumn<TRow>;
}

export interface DataGridColumnHelper<TRow extends object> {
  accessor: <TValue>(options: DataGridColumnOptions<TRow, TValue>) => DataGridColumn<TRow>;
}

const createDataGridColumn = <TRow extends object, TValue>({
  id,
  header,
  accessibilityLabel,
  getValue,
  getAccessibilityValue,
  renderCell,
}: DataGridColumnOptions<TRow, TValue>): DataGridColumn<TRow> => ({
  id,
  header,
  accessibilityLabel,
  [internalColumnDefinition]: {
    getValue,
    getAccessibilityValue: ({ row, ...context }, value) =>
      getAccessibilityValue({
        ...context,
        row,
        value: value as TValue,
      }),
    renderCell: ({ row, ...context }, value) =>
      renderCell({
        ...context,
        row,
        // This renderer and accessor are paired by this factory before TValue is erased.
        value: value as TValue,
      }),
  },
});

export const createDataGridColumnHelper = <TRow extends object>(): DataGridColumnHelper<TRow> => ({
  accessor: createDataGridColumn,
});

export const getDataGridColumnValue = <TRow extends object>(
  column: DataGridColumn<TRow>,
  row: TRow
): unknown => column[internalColumnDefinition].getValue(row);

export const getDataGridCellAccessibilityValue = <TRow extends object>(
  column: DataGridColumn<TRow>,
  context: InternalDataGridCellContext<TRow>,
  value: unknown
): string => column[internalColumnDefinition].getAccessibilityValue(context, value);

export const renderDataGridCell = <TRow extends object>(
  column: DataGridColumn<TRow>,
  context: InternalDataGridCellContext<TRow>,
  value: unknown
): ReactNode => column[internalColumnDefinition].renderCell(context, value);
