import type { RouteMap, Router } from './types';
export declare const MAX_PATH_LENGTH = 100000;
export declare function toReactRouterPath(path: string): string;
export declare function createRouter<TRoutes extends RouteMap>(routes: TRoutes): Router<TRoutes>;
