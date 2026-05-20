import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { SortOrder } from '../components/data_table';
import type { DataTableColumnsMeta } from '../types';
export declare const useSorting: ({ rows, visibleColumns, columnsMeta, sort, dataView, isPlainRecord, isSortEnabled, defaultColumns, onSort, }: {
    rows: DataTableRecord[] | undefined;
    visibleColumns: string[];
    columnsMeta: DataTableColumnsMeta | undefined;
    sort: SortOrder[];
    dataView: DataView;
    isPlainRecord: boolean;
    isSortEnabled: boolean;
    defaultColumns: boolean;
    onSort: ((sort: string[][]) => void) | undefined;
}) => {
    sortedRows: DataTableRecord[] | undefined;
    sorting: import("@elastic/eui").EuiDataGridSorting | undefined;
};
export declare const isSortable: ({ isPlainRecord, columnName, columnSchema, dataViewField, }: {
    isPlainRecord: boolean | undefined;
    columnName: string;
    columnSchema: string;
    dataViewField: DataViewField | undefined;
}) => boolean;
