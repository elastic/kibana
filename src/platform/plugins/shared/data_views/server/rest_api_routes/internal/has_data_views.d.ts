import type { IRouter, RequestHandlerContext } from '@kbn/core/server';
import type { VersionedRoute } from '@kbn/core-http-server';
type Handler = Parameters<VersionedRoute<any, RequestHandlerContext>['addVersion']>[1];
export declare const handler: Handler;
export declare const registerHasDataViewsRoute: (router: IRouter) => void;
export {};
