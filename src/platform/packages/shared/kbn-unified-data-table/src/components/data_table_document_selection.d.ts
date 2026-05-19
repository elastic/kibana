import React from 'react';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import type { ToastsStart } from '@kbn/core-notifications-browser';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { UseSelectedDocsState } from '../hooks/use_selected_docs';
import type { CustomBulkActions } from '../types';
export declare const SelectButton: (props: EuiDataGridCellValueElementProps) => React.JSX.Element | null;
export declare const getSelectAllButton: (rows: DataTableRecord[]) => () => React.JSX.Element | null;
export declare function DataTableDocumentToolbarBtn({ isPlainRecord, isFilterActive, rows, setIsFilterActive, selectedDocsState, enableComparisonMode, setIsCompareActive, fieldFormats, pageIndex, pageSize, toastNotifications, columns, customBulkActions, }: {
    isPlainRecord: boolean;
    isFilterActive: boolean;
    rows: DataTableRecord[];
    setIsFilterActive: (value: boolean) => void;
    selectedDocsState: UseSelectedDocsState;
    enableComparisonMode: boolean | undefined;
    setIsCompareActive: (value: boolean) => void;
    fieldFormats: FieldFormatsStart;
    pageIndex: number | undefined;
    pageSize: number | undefined;
    toastNotifications: ToastsStart;
    columns: string[];
    customBulkActions?: CustomBulkActions;
}): React.JSX.Element;
export declare const DataTableCompareToolbarBtn: ({ selectedDocIds, setIsCompareActive, }: {
    selectedDocIds: string[];
    setIsCompareActive: (value: boolean) => void;
}) => React.JSX.Element;
