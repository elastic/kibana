import type { ErrorsByTraceId } from '@kbn/apm-types';
export declare function useFetchErrorsByTraceId({ traceId, docId }: {
    traceId: string;
    docId?: string;
}): {
    loading: boolean;
    error: Error | undefined;
    response: ErrorsByTraceId;
};
