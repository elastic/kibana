import type { Request } from '@hapi/hapi';
import type { KibanaRequest, IsAuthenticated } from '@kbn/core-http-server';
import { AuthStatus } from '@kbn/core-http-server';
/** @internal */
export declare class AuthStateStorage {
    private readonly canBeAuthenticated;
    private readonly storage;
    constructor(canBeAuthenticated: () => boolean);
    set: (request: KibanaRequest | Request, state: unknown) => void;
    get: <T = unknown>(request: KibanaRequest | Request) => {
        status: AuthStatus;
        state: T;
    };
    isAuthenticated: IsAuthenticated;
}
