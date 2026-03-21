import type React from 'react';
import type { Datatable, DatatableColumn, DatatableRow } from '@kbn/expressions-plugin/common';
type DataViewColumnRender = (value: string, _item: DatatableRow) => React.ReactNode | string;
export interface DataViewColumn {
    originalColumn: () => DatatableColumn;
    name: string;
    field: string;
    sortable: boolean | ((item: DatatableRow) => string | number);
    render: DataViewColumnRender;
}
export type DataViewRow = DatatableRow;
export interface TableInspectorAdapter {
    [key: string]: Datatable;
}
export {};
