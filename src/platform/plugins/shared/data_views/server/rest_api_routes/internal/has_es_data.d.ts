import type { IRouter, Logger, RequestHandlerContext } from '@kbn/core/server';
import type { VersionedRoute } from '@kbn/core-http-server';
type Handler = Parameters<VersionedRoute<any, RequestHandlerContext>['addVersion']>[1];
export declare const patterns: string[];
export declare const crossClusterPatterns: string[];
export declare const createHandler: (parentLogger: Logger, hasEsDataTimeout: number) => Handler;
export declare const registerHasEsDataRoute: (router: IRouter, logger: Logger, hasEsDataTimeout: number) => void;
export {};
