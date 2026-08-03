import React from 'react';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { DataTableColumnsMeta } from '../types';
interface DataTableColumnHeaderProps {
    dataView: DataView;
    columnName: string | null;
    columnDisplayName: string;
    columnsMeta?: DataTableColumnsMeta;
    headerRowHeight?: number;
    showColumnTokens?: boolean;
}
export declare const DataTableColumnHeader: React.FC<DataTableColumnHeaderProps>;
export declare const DataTableTimeColumnHeader: ({ dataView, dataViewField, headerRowHeight, columnLabel, }: {
    dataView: DataView;
    dataViewField?: DataViewField;
    headerRowHeight?: number;
    columnLabel?: string;
}) => React.JSX.Element;
export declare const DataTableScoreColumnHeader: ({ isSorted, showColumnTokens, columnName, columnsMeta, dataView, headerRowHeight, columnDisplayName, }: DataTableColumnHeaderProps & {
    isSorted?: boolean;
}) => React.JSX.Element;
export {};
