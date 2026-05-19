interface UseFetchSpanParams {
    spanId: string;
    traceId: string;
}
export declare const useFetchSpan: ({ spanId, traceId }: UseFetchSpanParams) => {
    loading: boolean;
    error: Error | undefined;
    span: import("@kbn/apm-types").UnifiedSpanDocument | undefined;
};
export {};
