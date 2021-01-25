/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IFieldFormat } from 'src/plugins/data/public';
import { SchemaConfig } from 'src/plugins/visualizations/public';

export enum AggTypes {
  SUM = 'sum',
  AVG = 'avg',
  MIN = 'min',
  MAX = 'max',
  COUNT = 'count',
}

export interface Dimensions {
  buckets: SchemaConfig[];
  metrics: SchemaConfig[];
  splitColumn?: SchemaConfig[];
  splitRow?: SchemaConfig[];
}

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

export interface TableVisParams {
  perPage: number | '';
  showPartialRows: boolean;
  showMetricsAtAllLevels: boolean;
  showToolbar: boolean;
  showTotal: boolean;
  totalFunc: AggTypes;
  percentageCol: string;
}

export interface TableVisConfig extends TableVisParams {
  title: string;
  dimensions: Dimensions;
}

export interface FormattedColumn {
  id: string;
  title: string;
  formatter: IFieldFormat;
  formattedTotal?: string | number;
  filterable: boolean;
  sumTotal?: number;
  total?: number;
}
