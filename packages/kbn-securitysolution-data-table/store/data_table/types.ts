/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EuiDataGridColumn } from '@elastic/eui';
import type { ColumnHeaderOptions, SortColumnTable } from '../../common/types';
import type { DataTableModel, DataTableModelSettings } from './model';

/** The state of all timelines is stored here */
export interface DataTableState {
  dataTable: TableState;
}

export type { DataTableModel };

/** A map of id to data table  */
export interface TableById {
  [id: string]: DataTableModel;
}

export const EMPTY_TABLE_BY_ID: TableById = {}; // stable reference

/** The state of all data tables is stored here */
export interface TableState {
  tableById: TableById;
}

export interface InitialyzeDataTableSettings extends Partial<DataTableModelSettings> {
  id: string;
}

export interface DataTablePersistInput
  extends Partial<Omit<DataTableModel, keyof DataTableModelSettings>> {
  id: string;
  columns: ColumnHeaderOptions[];
  indexNames: string[];
  showCheckboxes?: boolean;
  defaultColumns: Array<
    Pick<EuiDataGridColumn, 'display' | 'displayAsText' | 'id' | 'initialWidth'> &
      ColumnHeaderOptions
  >;
  sort: SortColumnTable[];
}
