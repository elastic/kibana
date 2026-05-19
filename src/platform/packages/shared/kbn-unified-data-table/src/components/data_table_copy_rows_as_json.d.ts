import React from 'react';
import type { ToastsStart } from '@kbn/core/public';
import type { DataTableRecord } from '@kbn/discover-utils';
interface DataTableCopyRowsAsJsonProps {
    rows: DataTableRecord[];
    toastNotifications: ToastsStart;
    onCompleted: () => void;
}
export declare const DataTableCopyRowsAsJson: React.FC<DataTableCopyRowsAsJsonProps>;
export {};
