import type { ConnectionRequestParams } from '@elastic/transport';
import type { EsqlAsyncQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import type { IncomingHttpHeaders } from 'http';
/**
 * Get the Kibana representation of an async search response (see `IKibanaSearchResponse`).
 */
export declare function toAsyncKibanaSearchResponse(response: EsqlAsyncQueryResponse, headers: IncomingHttpHeaders, requestParams?: ConnectionRequestParams): IKibanaSearchResponse<EsqlAsyncQueryResponse>;
