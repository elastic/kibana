import type { UnifiedHistogramFetch$, UnifiedHistogramHitsContext, UnifiedHistogramServices } from '../../../types';
import { UnifiedHistogramFetchStatus } from '../../../types';
export declare const useTotalHits: ({ services, hits, chartVisible, fetch$, abortController: parentAbortController, onTotalHitsChange, }: {
    services: UnifiedHistogramServices;
    hits: UnifiedHistogramHitsContext | undefined;
    chartVisible: boolean;
    fetch$: UnifiedHistogramFetch$;
    abortController: AbortController | undefined;
    onTotalHitsChange?: (status: UnifiedHistogramFetchStatus, result?: number | Error) => void;
}) => void;
