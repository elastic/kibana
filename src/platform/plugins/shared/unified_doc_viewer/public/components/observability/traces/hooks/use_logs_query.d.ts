export interface GetLogsQueryParams {
    traceId: string;
    transactionId?: string;
    spanId?: string;
}
export declare function useLogsQuery({ traceId, spanId, transactionId }: GetLogsQueryParams): {
    language: string;
    query: string;
};
