import type { DataTableRecord } from '@kbn/discover-utils';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import type { TraceDocFlyoutType } from '../../../common/types';
export interface UseDocumentFlyoutDataParams {
    type: TraceDocFlyoutType;
    docId: string;
    traceId: string;
    docIndex?: string;
}
/**
 * Base interface that all flyout data hooks must implement.
 * Any new flyout type should extend this interface.
 */
export interface BaseFlyoutData {
    hit: DataTableRecord | null;
    loading: boolean;
    title: string;
    error: string | null;
}
export interface DocumentFlyoutData extends BaseFlyoutData {
    type: TraceDocFlyoutType;
    logDataView?: DocViewRenderProps['dataView'] | null;
}
/**
 * Unified hook for fetching document flyout data.
 * Orchestrates the individual hooks based on document type.
 * Both hooks are called but short-circuit with empty params when not needed.
 */
export declare function useDocumentFlyoutData({ type, docId, traceId, docIndex, }: UseDocumentFlyoutDataParams): DocumentFlyoutData;
