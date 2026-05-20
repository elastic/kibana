import React from 'react';
export interface SimilarSpansProps {
    duration: number;
    spanName?: string;
    serviceName?: string;
    transactionName?: string;
    transactionType?: string;
    isOtelSpan?: boolean;
}
export declare function SimilarSpans({ duration, spanName, serviceName, transactionName, transactionType, isOtelSpan, }: SimilarSpansProps): React.JSX.Element;
