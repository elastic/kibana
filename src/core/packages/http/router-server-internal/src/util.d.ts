import { type RouteValidatorFullConfigResponse, type RouteMethod, validBodyOutput } from '@kbn/core-http-server';
import type { IKibanaResponse, ResponseHeaders, SafeRouteMethod } from '@kbn/core-http-server';
import type { Request } from '@hapi/hapi';
import type { InternalRouteConfig } from './route';
export declare function prepareResponseValidation(validation: RouteValidatorFullConfigResponse): RouteValidatorFullConfigResponse;
export declare function prepareRouteConfigValidation<P, Q, B>(config: InternalRouteConfig<P, Q, B, RouteMethod>): InternalRouteConfig<P, Q, B, RouteMethod>;
/**
 * @note mutates the response object
 * @internal
 */
export declare function injectResponseHeaders(headers: ResponseHeaders, response: IKibanaResponse): IKibanaResponse;
export declare function getVersionHeader(version: string): ResponseHeaders;
export declare function injectVersionHeader(version: string, response: IKibanaResponse): IKibanaResponse;
export declare function formatErrorMeta(statusCode: number, { error, request, }: {
    error: Error;
    request: Request;
}): {
    http: {
        response: {
            status_code: number;
        };
        request: {
            method: "search" | "link" | "source" | "subscribe" | "*" | "delete" | "get" | "options" | "post" | "put" | "patch" | "trace" | "unsubscribe" | "bind" | "copy" | "lock" | "merge" | "move" | "unlink" | "report" | "rebind" | "unbind" | "connect" | "acl" | "checkout" | "m-search" | "mkactivity" | "mkcalendar" | "mkcol" | "notify" | "propfind" | "proppatch" | "purge" | "unlock";
            path: string;
        };
    };
    error: {
        message: string;
    };
};
export declare function getRouteFullPath(routerPath: string, routePath: string): string;
export declare function isSafeMethod(method: RouteMethod): method is SafeRouteMethod;
/**
 * Create a valid options object with "sensible" defaults + adding some validation to the options fields
 *
 * @param method HTTP verb for these options
 * @param routeConfig The route config definition
 */
export declare function validOptions(method: RouteMethod, routeConfig: InternalRouteConfig<unknown, unknown, unknown, typeof method>): {
    body: {
        accepts?: import("@kbn/core-http-server").RouteContentType | import("@kbn/core-http-server").RouteContentType[] | string | string[];
        override?: string;
        maxBytes?: number;
        output: (typeof validBodyOutput)[number];
        parse: boolean | "gunzip";
    } | undefined;
    xsrfRequired?: boolean | undefined;
    access?: import("@kbn/core-http-server").RouteAccess;
    tags?: readonly string[];
    timeout?: {
        payload?: number | undefined;
        idleSocket?: number;
    } | undefined;
    summary?: string;
    description?: string;
    deprecated?: import("@kbn/core-http-server").RouteDeprecationInfo;
    oasOperationObject?: import("@kbn/core/packages/http/server/src/router/route").OASOperationObjectProvider;
    excludeFromOAS?: boolean;
    excludeFromRateLimiter?: boolean;
    discontinued?: string;
    httpResource?: boolean;
    availability?: {
        stability?: "experimental" | "stable" | "tech_preview";
        since?: string;
    };
};
