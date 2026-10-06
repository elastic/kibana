import { KbnError } from '@kbn/kibana-utils-plugin/common';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import type { SearchError } from './types';
/**
 * Request Failure - When an entire multi request fails
 * @param {Error} err - the Error that came back
 * @param {Object} resp - optional HTTP response
 */
export declare class RequestFailure extends KbnError {
    resp?: IKibanaSearchResponse;
    constructor(err?: SearchError | null, resp?: IKibanaSearchResponse);
}
