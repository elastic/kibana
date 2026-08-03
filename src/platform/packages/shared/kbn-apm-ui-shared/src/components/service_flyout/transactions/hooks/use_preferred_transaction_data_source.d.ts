import type { HttpStart } from '@kbn/core-http-browser';
export interface PreferredTransactionDataSource {
    documentType: string;
    rollupInterval: string;
}
export declare function parseIntervalSeconds(rollupInterval: string): number;
export declare function usePreferredTransactionDataSource({ http, start, end, }: {
    http: HttpStart;
    start: string;
    end: string;
}): {
    dataSource: PreferredTransactionDataSource | undefined;
    isLoading: boolean;
    error: unknown;
};
