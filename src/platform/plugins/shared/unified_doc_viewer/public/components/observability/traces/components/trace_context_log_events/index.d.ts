import React from 'react';
export interface TraceContextLogEventsProps {
    traceId: string;
    spanId?: string;
    transactionId?: string;
}
export declare function TraceContextLogEvents({ traceId, transactionId, spanId, }: TraceContextLogEventsProps): React.JSX.Element | null;
