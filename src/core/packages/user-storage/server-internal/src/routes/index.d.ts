import type { IRouter, KibanaRequest } from '@kbn/core-http-server';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { IUserStorageClient } from '@kbn/core-user-storage-common';
export interface RegisterRoutesParams {
    router: IRouter<RequestHandlerContext>;
    /**
     * Returns a scoped client for the given request, or `null` when the request
     * has no user profile (e.g. API-key auth). Supplied by the service at start
     * time so that namespace resolution is handled in one place.
     */
    getClient: (request: KibanaRequest) => IUserStorageClient | null;
}
export declare const registerRoutes: ({ router, getClient }: RegisterRoutesParams) => void;
