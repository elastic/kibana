import React from 'react';
import type { ToastsStart } from '@kbn/core/public';
import type { DataTableRecord } from '@kbn/discover-utils';
import { CopyAsTextFormat } from '../utils/copy_value_to_clipboard';
interface DataTableCopyRowsAsTextProps {
    format: CopyAsTextFormat;
    rows: DataTableRecord[];
    toastNotifications: ToastsStart;
    columns: string[];
    onCompleted: () => void;
}
export declare const DataTableCopyRowsAsText: React.FC<DataTableCopyRowsAsTextProps>;
export {};
