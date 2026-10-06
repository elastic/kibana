import type { Request } from '@hapi/hapi';
import type { KibanaRequest, AuthHeaders, IAuthHeadersStorage, GetAuthHeaders } from '@kbn/core-http-server';
/** @internal */
export declare class AuthHeadersStorage implements IAuthHeadersStorage {
    private authHeadersCache;
    set: (request: KibanaRequest | Request, headers: AuthHeaders) => void;
    get: GetAuthHeaders;
}
