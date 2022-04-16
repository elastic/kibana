/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IFieldFormat } from '@kbn/field-formats-plugin/common';
import { DatatableColumn, DatatableRow } from '@kbn/expressions-plugin';
import { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/public';
import { TableVisParams } from '../common';

export interface ColumnWidthData {
  colIndex: number;
  width: number;
}

export interface TableVisUiState {
  sort: {
    columnIndex: number | null;
    direction: 'asc' | 'desc' | null;
  };
  colWidth: ColumnWidthData[];
}

export interface TableVisUseUiStateProps {
  columnsWidth: TableVisUiState['colWidth'];
  sort: TableVisUiState['sort'];
  setSort: (s?: TableVisUiState['sort']) => void;
  setColumnsWidth: (column: ColumnWidthData) => void;
}

export interface TableVisConfig extends TableVisParams {
  title: string;
  buckets?: ExpressionValueVisDimension[];
  metrics: ExpressionValueVisDimension[];
  splitColumn?: ExpressionValueVisDimension;
  splitRow?: ExpressionValueVisDimension;
}

export interface FormattedColumn {
  title: string;
  formatter: IFieldFormat;
  formattedTotal?: string | number;
  filterable: boolean;
  sumTotal?: number;
  total?: number;
}

export interface FormattedColumns {
  [key: string]: FormattedColumn;
}

export interface TableContext {
  columns: DatatableColumn[];
  rows: DatatableRow[];
  formattedColumns: FormattedColumns;
}

export interface TableGroup {
  table: TableContext;
  title: string;
}

export interface TableVisData {
  table?: TableContext;
  tables: TableGroup[];
  direction?: 'row' | 'column';
}
