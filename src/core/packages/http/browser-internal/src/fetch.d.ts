import type { ExecutionContextSetup } from '@kbn/core-execution-context-browser';
import type { IBasePath, HttpInterceptor, HttpHandler } from '@kbn/core-http-browser';
interface Params {
    basePath: IBasePath;
    kibanaVersion: string;
    buildNumber: number;
    executionContext: ExecutionContextSetup;
}
export declare class Fetch {
    private readonly params;
    private readonly interceptors;
    private readonly requestCount$;
    constructor(params: Params);
    intercept(interceptor: HttpInterceptor): () => void;
    removeAllInterceptors(): void;
    getRequestCount$(): import("rxjs").Observable<number>;
    readonly delete: HttpHandler;
    readonly get: HttpHandler;
    readonly head: HttpHandler;
    readonly options: HttpHandler;
    readonly patch: HttpHandler;
    readonly post: HttpHandler;
    readonly put: HttpHandler;
    fetch: HttpHandler;
    private createRequest;
    private fetchResponse;
    private shorthand;
}
export {};
