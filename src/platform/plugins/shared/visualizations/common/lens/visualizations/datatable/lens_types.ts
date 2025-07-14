/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Direction } from '@elastic/eui';
import { ColorMapping } from '@kbn/coloring';
import { DatatableColumn } from '@kbn/expressions-plugin/common';
import { CollapseFunction } from '../lens_types';
import { SortingHint } from '../../lens_types';
import { LENS_DATATABLE_COLUMN } from './constants';

export interface LensDatatableSortingState {
  columnId: string | undefined;
  direction: 'asc' | 'desc' | 'none';
}

export interface LensDatatablePagingState {
  size: number;
  enabled: boolean;
}

export interface LensDatatableArgs {
  title: string;
  description?: string;
  columns: DatatableColumnResult[];
  sortingColumnId: LensDatatableSortingState['columnId'];
  sortingDirection: LensDatatableSortingState['direction'];
  fitRowToContent?: boolean;
  rowHeightLines?: number;
  headerRowHeight?: RowHeightMode;
  headerRowHeightLines?: number;
  pageSize?: LensDatatablePagingState['size'];
  density?: DataGridDensity;
}

export type LensGridDirection = 'none' | Direction;

export interface DatatableColumnConfig {
  columns: DatatableColumnResult[];
  sortingColumnId: string | undefined;
  sortingDirection: LensGridDirection;
}

export type DatatableColumnArgs = Omit<ColumnState, 'palette' | 'colorMapping'> & {
  palette?: PaletteOutput<CustomPaletteState>;
  colorMapping?: string;
  summaryRowValue?: unknown;
  sortingHint?: SortingHint;
};

export type DatatableColumnResult = DatatableColumnArgs & {
  type: typeof LENS_DATATABLE_COLUMN;
};

export interface ColumnState {
  columnId: string;
  width?: number;
  hidden?: boolean;
  oneClickFilter?: boolean;
  isTransposed?: boolean;
  // These flags are necessary to transpose columns and map them back later
  // They are set automatically and are not user-editable
  transposable?: boolean;
  originalColumnId?: string;
  originalName?: string;
  bucketValues?: Array<{ originalBucketColumn: DatatableColumn; value: unknown }>;
  alignment?: 'left' | 'right' | 'center';
  /**
   * @deprecated use `colorMapping` config
   */
  palette?: PaletteOutput<CustomPaletteParams>;
  colorMapping?: ColorMapping.Config;
  colorMode?: 'none' | 'cell' | 'text';
  summaryRow?: 'none' | 'sum' | 'avg' | 'count' | 'min' | 'max';
  summaryLabel?: string;
  collapseFn?: CollapseFunction;
  isMetric?: boolean;
}
