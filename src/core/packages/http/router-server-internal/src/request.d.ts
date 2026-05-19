import { URL } from 'url';
import { inspect } from 'util';
import type { Request } from '@hapi/hapi';
import type { RecursiveReadonly } from '@kbn/utility-types';
import type { KibanaRequest, Headers, RouteMethod, IKibanaSocket, RouteValidatorFullConfigRequest, KibanaRequestRoute, KibanaRequestEvents, KibanaRequestAuth, KibanaRequestRouteOptions, RawRequest, HttpProtocol, RequestTiming } from '@kbn/core-http-server';
import { RouteValidator } from './validator';
declare const requestSymbol: unique symbol;
/**
 * Core internal implementation of {@link KibanaRequest}
 * @internal
 * @remarks Only publicly exposed for consumers that need to forge requests using {@link CoreKibanaRequest.from}.
 *          All other usages should import and use the {@link KibanaRequest} interface instead.
 */
export declare class CoreKibanaRequest<Params = unknown, Query = unknown, Body = unknown, Method extends RouteMethod = any> implements KibanaRequest<Params, Query, Body, Method> {
    readonly params: Params;
    readonly query: Query;
    readonly body: Body;
    private readonly withoutSecretHeaders;
    /**
     * Factory for creating requests. Validates the request before creating an
     * instance of a KibanaRequest.
     * @internal
     */
    static from<P, Q, B>(req: RawRequest, routeSchemas?: RouteValidator<P, Q, B> | RouteValidatorFullConfigRequest<P, Q, B> | undefined, withoutSecretHeaders?: boolean): CoreKibanaRequest<P, Q, B, any>;
    /**
     * Validates the different parts of a request based on the schemas defined for
     * the route. Builds up the actual params, query and body object that will be
     * received in the route handler.
     * @internal
     */
    private static validate;
    /** {@inheritDoc KibanaRequest.id} */
    readonly id: string;
    /** {@inheritDoc KibanaRequest.uuid} */
    readonly uuid: string;
    /** {@inheritDoc KibanaRequest.url} */
    readonly url: URL;
    /** {@inheritDoc KibanaRequest.route} */
    readonly route: RecursiveReadonly<KibanaRequestRoute<Method>>;
    /** {@inheritDoc KibanaRequest.headers} */
    readonly headers: Headers;
    /** {@inheritDoc KibanaRequest.isSystemRequest} */
    readonly isSystemRequest: boolean;
    /** {@inheritDoc KibanaRequest.socket} */
    readonly socket: IKibanaSocket;
    /** {@inheritDoc KibanaRequest.events} */
    readonly events: KibanaRequestEvents;
    /** {@inheritDoc KibanaRequest.auth} */
    readonly auth: KibanaRequestAuth;
    /** {@inheritDoc KibanaRequest.isFakeRequest} */
    readonly isFakeRequest: boolean;
    /** {@inheritDoc KibanaRequest.isInternalApiRequest} */
    readonly isInternalApiRequest: boolean;
    /** {@inheritDoc KibanaRequest.rewrittenUrl} */
    readonly rewrittenUrl?: URL;
    /** {@inheritDoc KibanaRequest.httpVersion} */
    readonly httpVersion: string;
    /** {@inheritDoc KibanaRequest.apiVersion} */
    readonly apiVersion: undefined;
    /** {@inheritDoc KibanaRequest.protocol} */
    readonly protocol: HttpProtocol;
    /** {@inheritDoc KibanaRequest.authzResult} */
    readonly authzResult?: Record<string, boolean>;
    /** {@inheritDoc KibanaRequest.timing} */
    readonly serverTiming: RequestTiming;
    /** @internal */
    protected readonly [requestSymbol]: Request;
    constructor(request: RawRequest, params: Params, query: Query, body: Body, withoutSecretHeaders: boolean);
    /**
     * Hapi does not officially support HTTP2 at the moment.
     * - On HTTP/2 the 'Host:' header is replaced by ':authority:'.
     * - Thus, for HTTP/2 requests, Hapi's request.url getter defaults to using
     *   the server host information to build the full URL.
     * - If we configure Kibana to use a "bare" IPv6 host (without square brackets),
     *   this causes Hapi's request.url getter to try to build ambiguous invalid URLs.
     *
     * Note that an IPv6 address like 2001:db8::1:8080 would be ambiguous,
     * as 8080 could be interpreted as the last segment of the IP address rather than the port.
     *
     * This method alters the original Hapi Request object,
     * injecting the missing 'Host:' header if the ':authority:' information is present (i.e. HTTP/2 request).
     * This way, the URL is no longer built using server host information,
     * which causes https://github.com/elastic/kibana/issues/236380 when using IPv6 server.host
     *
     * TODO remove this when https://github.com/hapijs/hapi/issues/4560 is addressed
     * @param request the request to 'decorate'
     */
    injectHostInfo(request: RawRequest): void;
    toString(): string;
    toJSON(): {
        id: string;
        uuid: string;
        url: string;
        isFakeRequest: boolean;
        isSystemRequest: boolean;
        isInternalApiRequest: boolean;
        auth: {
            isAuthenticated: boolean;
        };
        route: Readonly<{
            path: string;
            method: RecursiveReadonly<Method>;
            options: RecursiveReadonly<KibanaRequestRouteOptions<Method>>;
            routePath?: string | undefined;
        }>;
        authzResult: Record<string, boolean> | undefined;
        apiVersion: undefined;
    };
    [inspect.custom](): {
        id: string;
        uuid: string;
        url: string;
        isFakeRequest: boolean;
        isSystemRequest: boolean;
        isInternalApiRequest: boolean;
        auth: {
            isAuthenticated: boolean;
        };
        route: Readonly<{
            path: string;
            method: RecursiveReadonly<Method>;
            options: RecursiveReadonly<KibanaRequestRouteOptions<Method>>;
            routePath?: string | undefined;
        }>;
        authzResult: Record<string, boolean> | undefined;
        apiVersion: undefined;
    };
    private getEvents;
    private getRouteInfo;
    private getSecurity;
    /** set route access to internal if not declared */
    private getAccess;
    private getAuthRequired;
    private isExcludedFromRateLimiter;
}
/**
 * Returns underlying Hapi Request
 * @internal
 */
export declare const ensureRawRequest: (request: KibanaRequest | Request) => Request<import("@hapi/hapi").ReqRefDefaults>;
/**
 * Checks if an incoming request is a {@link KibanaRequest}
 * @internal
 */
export declare function isKibanaRequest(request: unknown): request is CoreKibanaRequest;
/**
 * Checks if an incoming request either KibanaRequest or Hapi.Request
 * @internal
 */
export declare function isRealRequest(request: unknown): request is KibanaRequest | Request;
export declare function getProtocolFromRequest(request: Request): HttpProtocol;
export {};
