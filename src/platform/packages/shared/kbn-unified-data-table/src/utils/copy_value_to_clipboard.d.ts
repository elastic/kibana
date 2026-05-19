import type { ToastsStart } from '@kbn/core/public';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { ValueToStringConverter } from '../types';
export declare enum CopyAsTextFormat {
    tabular = "tabular",
    markdown = "markdown"
}
export declare const copyValueToClipboard: ({ rowIndex, columnId, toastNotifications, valueToStringConverter, }: {
    rowIndex: number;
    columnId: string;
    toastNotifications: ToastsStart;
    valueToStringConverter: ValueToStringConverter;
}) => string | null;
export declare const copyColumnValuesToClipboard: ({ columnId, columnDisplayName, toastNotifications, valueToStringConverter, rowsCount, }: {
    columnId: string;
    columnDisplayName: string;
    toastNotifications: ToastsStart;
    valueToStringConverter: ValueToStringConverter;
    rowsCount: number;
}) => Promise<string | null>;
export declare const copyColumnNameToClipboard: ({ columnDisplayName, toastNotifications, }: {
    columnDisplayName: string;
    toastNotifications: ToastsStart;
}) => string | null;
export declare const copyRowsAsTextToClipboard: ({ columns, dataView, selectedRowIndices, toastNotifications, valueToStringConverter, format, }: {
    columns: string[];
    dataView: DataView;
    selectedRowIndices: number[];
    toastNotifications: ToastsStart;
    valueToStringConverter: ValueToStringConverter;
    format: CopyAsTextFormat;
}) => Promise<string | null>;
export declare const copyRowsAsJsonToClipboard: ({ selectedRows, toastNotifications, }: {
    selectedRows: DataTableRecord[];
    toastNotifications: ToastsStart;
}) => Promise<string | null>;
