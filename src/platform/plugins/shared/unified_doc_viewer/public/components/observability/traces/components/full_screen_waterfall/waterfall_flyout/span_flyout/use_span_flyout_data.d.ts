import type { BaseFlyoutData } from '../use_document_flyout_data';
export interface UseSpanFlyoutDataParams {
    spanId: string;
    traceId: string;
}
export type SpanFlyoutData = BaseFlyoutData;
export declare function useSpanFlyoutData({ spanId, traceId }: UseSpanFlyoutDataParams): SpanFlyoutData;
