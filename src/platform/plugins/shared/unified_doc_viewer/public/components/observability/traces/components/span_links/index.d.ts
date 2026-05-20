import React from 'react';
import type { SpanLinkDetails } from '@kbn/apm-types';
import type { ProcessorEvent } from '@kbn/apm-types-shared';
export interface Props {
    traceId: string;
    docId: string;
    processorEvent?: ProcessorEvent;
}
export type SpanLinkType = 'incoming' | 'outgoing';
export declare function SpanLinks({ docId, traceId, processorEvent }: Props): React.JSX.Element | null;
export declare function getIncomingSpanLinksESQL(traceId: string, docId: string): import("@kbn/esql-composer").QueryOperator;
export declare function getOutgoingSpanLinksESQL(spanLinks: SpanLinkDetails[]): import("@kbn/esql-composer").QueryOperator;
