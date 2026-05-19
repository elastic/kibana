import React from 'react';
import type { FieldRow } from './field_row';
import { type UseTableFiltersCallbacksReturn } from './table_filters';
interface TableCellProps {
    searchTerm: string;
    rows: FieldRow[];
    rowIndex: number;
    columnId: string;
    isDetails: boolean;
    isESQLMode: boolean;
    onFindSearchTermMatch?: UseTableFiltersCallbacksReturn['onFindSearchTermMatch'];
}
export declare const TableCell: React.FC<TableCellProps>;
export {};
