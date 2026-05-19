import type { TraceRootSpan } from '@kbn/apm-types';
interface UseFetchTraceRootItemParams {
    traceId: string;
}
export declare const TraceRootSpanProvider: import("react").FC<import("react").PropsWithChildren<UseFetchTraceRootItemParams>>, useFetchTraceRootSpanContext: () => {
    loading: boolean;
    error: Error | undefined;
    span: TraceRootSpan | undefined;
};
export {};
