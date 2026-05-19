import type { PathsOf, RouteMap } from '../..';
import type { Breadcrumb } from './context';
type UseBreadcrumbs<TRouteMap extends RouteMap> = <TPath extends PathsOf<TRouteMap>>(callback: () => Breadcrumb<TRouteMap, TPath> | Array<Breadcrumb<TRouteMap, TPath>>, fnDeps: unknown[]) => void;
export declare function useRouterBreadcrumb(callback: () => Breadcrumb | Breadcrumb[], fnDeps: any[]): void;
export declare function createUseBreadcrumbs<TRouteMap extends RouteMap>(): UseBreadcrumbs<TRouteMap>;
export {};
