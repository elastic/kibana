import { type FunctionComponent, type RefObject } from 'react';
import { type EuiDataGridRefProps } from '@kbn/unified-data-table';
import { type DataGridCellValueElementProps } from '@kbn/unified-data-table';
import type { DataTableRecord } from '@kbn/discover-utils';
export declare const getCellValueRenderer: (rows: DataTableRecord[], dataTableRef: RefObject<EuiDataGridRefProps>, canEditIndex: boolean) => FunctionComponent<DataGridCellValueElementProps>;
