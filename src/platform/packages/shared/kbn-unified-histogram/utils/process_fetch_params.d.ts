import type { UnifiedHistogramFetchParams, UnifiedHistogramFetchParamsExternal, UnifiedHistogramServices } from '../types';
export declare const processFetchParams: ({ params, services, initialBreakdownField, }: {
    params: UnifiedHistogramFetchParamsExternal;
    services: UnifiedHistogramServices;
    initialBreakdownField: string | undefined;
}) => UnifiedHistogramFetchParams;
