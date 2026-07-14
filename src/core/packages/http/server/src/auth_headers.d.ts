import type { KibanaRequest } from './router';
import type { AuthHeaders } from './lifecycle';
/**
 * Get headers to authenticate a user against Elasticsearch.
 * @param request {@link KibanaRequest} - an incoming request.
 * @return authentication headers {@link AuthHeaders} for - an incoming request.
 * @public
 * */
export type GetAuthHeaders = (request: KibanaRequest) => AuthHeaders | undefined;
/** @public */
export type SetAuthHeaders = (request: KibanaRequest, headers: AuthHeaders) => void;
/** @public */
export interface IAuthHeadersStorage {
    set: SetAuthHeaders;
    get: GetAuthHeaders;
}
