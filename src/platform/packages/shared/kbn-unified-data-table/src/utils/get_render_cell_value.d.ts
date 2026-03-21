import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { DataTableColumnsMeta, DataTableRecord, ShouldShowFieldInTableHandler } from '@kbn/discover-utils/types';
import type { CustomCellRenderer } from '../types';
export declare const CELL_CLASS = "unifiedDataTable__cellValue";
export declare const getRenderCellValueFn: ({ dataView, rows, shouldShowFieldHandler, closePopover, fieldFormats, maxEntries, externalCustomRenderers, isPlainRecord, isCompressed, columnsMeta, }: {
    dataView: DataView;
    rows: DataTableRecord[] | undefined;
    shouldShowFieldHandler: ShouldShowFieldInTableHandler;
    closePopover: () => void;
    fieldFormats: FieldFormatsStart;
    maxEntries: number;
    externalCustomRenderers?: CustomCellRenderer;
    isPlainRecord?: boolean;
    isCompressed?: boolean;
    columnsMeta: DataTableColumnsMeta | undefined;
}) => (({ rowIndex, columnId, isDetails, setCellProps, colIndex, isExpandable, isExpanded, }: EuiDataGridCellValueElementProps) => React.JSX.Element) | React.MemoExoticComponent<({ rowIndex, columnId, isDetails, setCellProps, colIndex, isExpandable, isExpanded, }: EuiDataGridCellValueElementProps) => React.JSX.Element>;
