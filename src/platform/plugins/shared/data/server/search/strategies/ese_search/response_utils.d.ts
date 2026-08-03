import type { ConnectionRequestParams } from '@elastic/transport';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import type { IncomingHttpHeaders } from 'http';
import type { AsyncSearchResponse } from './types';
import type { IAsyncSearchOptions } from '../../../../common';
/**
 * Get the Kibana representation of an async search response.
 */
export declare function toAsyncKibanaSearchResponse(response: AsyncSearchResponse, headers: IncomingHttpHeaders, requestParams?: ConnectionRequestParams, options?: IAsyncSearchOptions): IKibanaSearchResponse;
