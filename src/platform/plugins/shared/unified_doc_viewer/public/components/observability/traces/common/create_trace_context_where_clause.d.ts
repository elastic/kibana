export declare const createTraceContextWhereClause: ({ traceId, spanId, transactionId, }: {
    traceId: string;
    spanId?: string;
    transactionId?: string;
}) => import("@kbn/esql-composer").QueryOperator;
export declare const createTraceContextWhereClauseForErrors: ({ traceId, spanId, transactionId, }: {
    traceId: string;
    spanId?: string;
    transactionId?: string;
}) => import("@kbn/esql-composer").QueryOperator;
