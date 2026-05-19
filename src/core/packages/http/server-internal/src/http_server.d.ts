import type { Server } from '@hapi/hapi';
import type { Duration } from 'moment';
import type { Observable } from 'rxjs';
import type { InternalExecutionContextSetup } from '@kbn/core-execution-context-server-internal';
import type { InternalUserActivityServiceSetup } from '@kbn/core-user-activity-server-internal';
import type { CoreVersionedRouter, Router } from '@kbn/core-http-router-server-internal';
import type { HttpAuth, HttpServerInfo, HttpServiceSetup, IAuthHeadersStorage, IRouter, KibanaRequest } from '@kbn/core-http-server';
import type { CoreContext } from '@kbn/core-base-server-internal';
import type { HttpConfig } from './http_config';
import { type InternalStaticAssets } from './static_assets';
/** @internal */
export interface HttpServerSetup {
    server: Server;
    /**
     * Add all the routes registered with `router` to HTTP server request listeners.
     * @param router {@link IRouter} - a router with registered route handlers.
     */
    registerRouter: (router: IRouter) => void;
    /**
     * Add all the routes registered with `router` to HTTP server request listeners.
     * Unlike `registerRouter`, this function allows routes to be registered even after the server
     * has started listening for requests.
     * @param router {@link IRouter} - a router with registered route handlers.
     */
    registerRouterAfterListening: (router: IRouter) => void;
    /**
     * Register a static directory to be served by the Kibana server
     * @note Static assets may be served over CDN
     */
    registerStaticDir: (path: string, dirPath: string) => void;
    staticAssets: InternalStaticAssets;
    basePath: HttpServiceSetup['basePath'];
    csp: HttpServiceSetup['csp'];
    prototypeHardening: boolean;
    createCookieSessionStorageFactory: HttpServiceSetup['createCookieSessionStorageFactory'];
    registerOnPreRouting: HttpServiceSetup['registerOnPreRouting'];
    registerOnPreAuth: HttpServiceSetup['registerOnPreAuth'];
    registerAuth: HttpServiceSetup['registerAuth'];
    registerOnPostAuth: HttpServiceSetup['registerOnPostAuth'];
    registerOnPreResponse: HttpServiceSetup['registerOnPreResponse'];
    getDeprecatedRoutes: HttpServiceSetup['getDeprecatedRoutes'];
    authRequestHeaders: IAuthHeadersStorage;
    auth: HttpAuth;
    getServerInfo: () => HttpServerInfo;
}
/** @internal */
export type LifecycleRegistrar = Pick<HttpServerSetup, 'registerOnPreRouting' | 'registerOnPreAuth' | 'registerAuth' | 'registerOnPostAuth' | 'registerOnPreResponse'>;
export interface HttpServerSetupOptions {
    config$: Observable<HttpConfig>;
    executionContext?: InternalExecutionContextSetup;
    userActivity?: InternalUserActivityServiceSetup;
}
/** @internal */
export interface GetRoutersOptions {
    pluginId?: string;
}
export declare class HttpServer {
    private readonly coreContext;
    private readonly name;
    private readonly shutdownTimeout$;
    private server?;
    private config?;
    private subscriptions;
    private registeredRouters;
    private authRegistered;
    private cookieSessionStorageCreated;
    private handleServerResponseEvent?;
    private stopping;
    private stopped;
    private readonly log;
    private readonly logger;
    private readonly authState;
    private readonly authRequestHeaders;
    private readonly authResponseHeaders;
    private readonly env;
    private redactedSessionIdGetter?;
    constructor(coreContext: CoreContext, name: string, shutdownTimeout$: Observable<Duration>);
    isListening(): boolean;
    /** @internal */
    setRedactedSessionIdGetter(getter: (request: KibanaRequest) => Promise<string | undefined>): void;
    private registerRouter;
    private registerRouterAfterListening;
    setup({ config$, executionContext, userActivity, }: HttpServerSetupOptions): Promise<HttpServerSetup>;
    start(): Promise<void>;
    stop(): Promise<void>;
    private getAuthOption;
    private getDeprecatedRoutes;
    private setupGracefulShutdownHandlers;
    private setupBasePathRewrite;
    private setupConditionalCompression;
    private setupResponseLogging;
    private formatServerTimingHeader;
    private setupRequestStateAssignment;
    private createSubspan;
    private instrumentMetrics;
    private registerOnPreAuth;
    private registerOnPostAuth;
    private registerOnPreRouting;
    private registerOnPreResponse;
    private createCookieSessionStorageFactory;
    private registerAuth;
    getRouters({ pluginId }?: GetRoutersOptions): {
        routers: Router[];
        versionedRouters: CoreVersionedRouter[];
    };
    private registerStaticDir;
    private getSecurity;
    private configureRoute;
}
