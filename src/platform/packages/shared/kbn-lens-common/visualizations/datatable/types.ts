/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Direction } from '@elastic/eui';
import type { ColorMapping, CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { CustomPaletteState } from '@kbn/charts-plugin/common';
import type { $Values } from '@kbn/utility-types';
import type { CollapseFunction, LensEditEvent, LensLayerType } from '../types';
import type { SortingHint } from '../../types';
import type {
  LENS_DATAGRID_DENSITY,
  LENS_DATATABLE_COLUMN,
  LENS_EDIT_PAGESIZE_ACTION,
  LENS_EDIT_RESIZE_ACTION,
  LENS_EDIT_SORT_ACTION,
  LENS_ROW_HEIGHT_MODE,
  LENS_TOGGLE_ACTION,
} from './constants';

export type RowHeightMode = $Values<typeof LENS_ROW_HEIGHT_MODE>;
export type DataGridDensity = $Values<typeof LENS_DATAGRID_DENSITY>;

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

export interface LensSortActionData {
  columnId: string | undefined;
  direction: LensGridDirection;
}

export interface LensResizeActionData {
  columnId: string;
  width: number | undefined;
}

export interface LensToggleActionData {
  columnId: string;
}

export interface LensPagesizeActionData {
  size: number;
}

export type LensSortAction = LensEditEvent<typeof LENS_EDIT_SORT_ACTION>;
export type LensResizeAction = LensEditEvent<typeof LENS_EDIT_RESIZE_ACTION>;
export type LensToggleAction = LensEditEvent<typeof LENS_TOGGLE_ACTION>;
export type LensPagesizeAction = LensEditEvent<typeof LENS_EDIT_PAGESIZE_ACTION>;

export interface SortingState {
  columnId: string | undefined;
  direction: 'asc' | 'desc' | 'none';
}

export interface PagingState {
  size: number;
  enabled: boolean;
}

export interface DatatableVisualizationState {
  columns: ColumnState[];
  layerId: string;
  layerType: LensLayerType;
  sorting?: SortingState;
  rowHeight?: RowHeightMode;
  headerRowHeight?: RowHeightMode;
  rowHeightLines?: number;
  headerRowHeightLines?: number;
  paging?: PagingState;
  density?: DataGridDensity;
  showRowNumbers?: boolean;
}
