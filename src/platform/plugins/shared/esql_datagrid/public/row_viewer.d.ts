import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord, DataTableColumnsMeta } from '@kbn/discover-utils/types';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { ChromeStart } from '@kbn/core-chrome-browser';
export interface RowViewerProps {
    notifications?: NotificationsStart;
    chrome: ChromeStart;
    columns: string[];
    columnsMeta?: DataTableColumnsMeta;
    hit: DataTableRecord;
    hits?: DataTableRecord[];
    flyoutType?: 'push' | 'overlay';
    dataView: DataView;
    onAddColumn: (column: string) => void;
    onClose: () => void;
    onRemoveColumn: (column: string) => void;
    setExpandedDoc: (doc?: DataTableRecord) => void;
}
export declare const FLYOUT_WIDTH_KEY = "esqlTable:flyoutWidth";
/**
 * Flyout displaying an expanded ES|QL row
 */
export declare function RowViewer({ hit, hits, dataView, columns, columnsMeta, notifications, chrome, flyoutType, onClose, onRemoveColumn, onAddColumn, setExpandedDoc, }: RowViewerProps): React.JSX.Element;
export default RowViewer;
