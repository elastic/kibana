import React from 'react';
import type { DocViewerProps } from '@kbn/unified-doc-viewer';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { EuiFlyoutProps } from '@elastic/eui';
import type { DataTableColumnsMeta, DataTableRecord } from '@kbn/discover-utils/types';
import type { ToastsStart } from '@kbn/core-notifications-browser';
import type { ChromeStart } from '@kbn/core/public';
import type { DocViewFilterFn, DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
export interface UnifiedDocViewerFlyoutProps extends Pick<DocViewerProps, 'initialTabId' | 'onUpdateSelectedTabId'> {
    docViewerRef?: DocViewerProps['ref'];
    'data-test-subj'?: string;
    flyoutTitle?: string;
    flyoutDefaultWidth?: EuiFlyoutProps['size'];
    flyoutActions?: React.ReactNode;
    flyoutType?: 'push' | 'overlay';
    flyoutWidthLocalStorageKey?: string;
    originDocType?: string;
    services: {
        toastNotifications?: ToastsStart;
        chrome: ChromeStart;
    };
    docViewsRegistry?: DocViewRenderProps['docViewsRegistry'];
    isEsqlQuery: boolean;
    columns: string[];
    columnsMeta?: DataTableColumnsMeta;
    hit: DataTableRecord;
    hits?: DataTableRecord[];
    dataView: DataView;
    hideFilteringOnComputedColumns?: boolean;
    initialDocViewerState?: DocViewerProps['initialState'];
    onInitialDocViewerStateChange?: DocViewerProps['onInitialStateChange'];
    renderCustomHeader?: (props: DocViewRenderProps) => React.ReactElement;
    renderCustomFooter?: (props: DocViewRenderProps) => React.ReactElement;
    setExpandedDoc: (doc?: DataTableRecord) => void;
    onClose: () => void;
    onAddColumn: (column: string) => void;
    onRemoveColumn: (column: string) => void;
    onFilter?: DocViewFilterFn;
}
export declare const FLYOUT_WIDTH_KEY = "unifiedDocViewer:flyoutWidth";
/**
 * Flyout displaying an expanded row details
 */
export declare function UnifiedDocViewerFlyout({ docViewerRef, 'data-test-subj': dataTestSubj, flyoutTitle, flyoutDefaultWidth, flyoutActions, flyoutType, flyoutWidthLocalStorageKey, originDocType, services, docViewsRegistry, isEsqlQuery, columns, columnsMeta, hit, hits, dataView, hideFilteringOnComputedColumns, initialTabId, initialDocViewerState, renderCustomHeader, renderCustomFooter, setExpandedDoc, onClose, onAddColumn, onRemoveColumn, onFilter, onInitialDocViewerStateChange, onUpdateSelectedTabId, }: UnifiedDocViewerFlyoutProps): React.JSX.Element;
