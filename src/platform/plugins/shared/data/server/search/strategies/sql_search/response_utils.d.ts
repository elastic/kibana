import type { ConnectionRequestParams } from '@elastic/transport';
import type { SqlQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import type { SqlSearchStrategyResponse } from '../../../../common';
/**
 * Get the Kibana representation of an async search response
 */
export declare function toAsyncKibanaSearchResponse(response: SqlQueryResponse, startTime: number, warning?: string, requestParams?: ConnectionRequestParams): SqlSearchStrategyResponse;
