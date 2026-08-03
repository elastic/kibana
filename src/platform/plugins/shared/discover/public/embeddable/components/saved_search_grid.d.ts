import React from 'react';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { AggregateQuery, Query, Filter } from '@kbn/es-query';
import type { SearchResponseWarning } from '@kbn/search-response-warnings';
import { type UnifiedDataTableProps } from '@kbn/unified-data-table';
import type { DocViewerApi } from '@kbn/unified-doc-viewer';
export interface InlineEditing {
    isActive: boolean;
    hasPendingChanges: boolean;
    onApply: () => Promise<void>;
    onCancel: () => Promise<void>;
}
interface DiscoverGridEmbeddableProps extends Omit<UnifiedDataTableProps, 'sampleSizeState'> {
    sampleSizeState: number;
    totalHitCount?: number;
    query: AggregateQuery | Query | undefined;
    filters: Filter[] | undefined;
    interceptedWarnings?: SearchResponseWarning[];
    onAddColumn: (column: string) => void;
    onRemoveColumn: (column: string) => void;
    savedSearchId?: string;
    enableDocumentViewer: boolean;
    inlineEditing: InlineEditing;
    expandedDoc: DataTableRecord | undefined;
    initialDocViewerTabId: string | undefined;
    docViewerRef: React.RefObject<DocViewerApi>;
    setExpandedDoc?: (doc: DataTableRecord | undefined, options?: {
        initialTabId?: string;
    }) => void;
}
export declare function DiscoverGridEmbeddable(props: DiscoverGridEmbeddableProps): React.JSX.Element;
export {};
