import type { SqlGetAsyncRequest, SqlQueryRequest, SqlQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import type { IKibanaSearchResponse, IKibanaSearchRequest } from '@kbn/search-types';
export declare const SQL_SEARCH_STRATEGY = "sql";
export type SqlRequestParams = (Omit<SqlQueryRequest, 'keep_alive' | 'keep_on_completion'> | Omit<SqlGetAsyncRequest, 'id' | 'keep_alive' | 'keep_on_completion'>) & {
    /**
     * Does not close the cursor on search completion.
     */
    keep_cursor?: boolean;
};
export type SqlSearchStrategyRequest = IKibanaSearchRequest<SqlRequestParams>;
export interface SqlSearchStrategyResponse extends IKibanaSearchResponse<SqlQueryResponse> {
    /**
     * A metric showing how long did the search take.
     */
    took: number;
}
