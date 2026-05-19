import type { SpanLinks } from '@kbn/apm-types';
import type { ProcessorEvent } from '@kbn/apm-types-shared';
export declare function useFetchSpanLinks({ docId, traceId, processorEvent, }: {
    docId: string;
    traceId: string;
    processorEvent?: ProcessorEvent;
}): {
    loading: boolean;
    error: Error | undefined;
    value: SpanLinks;
};
