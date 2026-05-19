import type { KibanaRequest, IBasePath } from '@kbn/core-http-server';
/**
 * Core internal implementation of {@link IBasePath}
 *
 * @internal
 */
export declare class BasePath implements IBasePath {
    private readonly basePathCache;
    readonly serverBasePath: string;
    readonly publicBaseUrl?: string;
    constructor(serverBasePath?: string, publicBaseUrl?: string);
    get: (request: KibanaRequest) => string;
    set: (request: KibanaRequest, requestSpecificBasePath: string) => void;
    prepend: (path: string) => string;
    remove: (path: string) => string;
}
