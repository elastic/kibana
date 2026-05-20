import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { AggregateQuery, Filter, Query } from '@kbn/es-query';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { DataTableColumnsMeta } from '@kbn/unified-data-table';
import type { DocViewerProps } from '@kbn/unified-doc-viewer';
import type { UnifiedDocViewerFlyoutProps } from '@kbn/unified-doc-viewer-plugin/public';
import type { DocViewerExtensionParams } from '../../context_awareness';
export declare const FLYOUT_WIDTH_KEY = "discover:flyoutWidth";
export interface DiscoverGridFlyoutProps extends Pick<UnifiedDocViewerFlyoutProps, 'initialDocViewerState' | 'onInitialDocViewerStateChange' | 'onUpdateSelectedTabId'> {
    savedSearchId?: string;
    filters?: Filter[];
    query?: Query | AggregateQuery;
    columns: string[];
    columnsMeta?: DataTableColumnsMeta;
    hit: DataTableRecord;
    hits?: DataTableRecord[];
    dataView: DataView;
    initialTabId?: string;
    docViewerRef?: DocViewerProps['ref'];
    docViewerExtensionActions?: DocViewerExtensionParams['actions'];
    onAddColumn: (column: string) => void;
    onClose: () => void;
    onFilter?: DocViewFilterFn;
    onRemoveColumn: (column: string) => void;
    setExpandedDoc: (doc?: DataTableRecord, options?: {
        initialTabId?: string;
        initialTabState?: object;
    }) => void;
    hideFilteringOnComputedColumns?: boolean;
}
/**
 * Flyout displaying an expanded Elasticsearch document
 */
export declare function DiscoverGridFlyout({ hit, hits, dataView, columns, columnsMeta, savedSearchId, filters, query, initialTabId, docViewerRef, docViewerExtensionActions, onFilter, onClose, onRemoveColumn, onAddColumn, setExpandedDoc, initialDocViewerState, onInitialDocViewerStateChange, onUpdateSelectedTabId, hideFilteringOnComputedColumns, }: DiscoverGridFlyoutProps): React.JSX.Element;
export default DiscoverGridFlyout;
