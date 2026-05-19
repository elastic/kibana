import React from 'react';
import type { PathsOf, Route, RouteMap, RouteMatch, TypeAsParams, TypeOf } from '../..';
export type Breadcrumb<TRouteMap extends RouteMap = RouteMap, TPath extends PathsOf<TRouteMap> = PathsOf<TRouteMap>> = {
    title: string;
    path: TPath;
} & TypeAsParams<TypeOf<TRouteMap, TPath, false>>;
interface BreadcrumbApi<TRouteMap extends RouteMap = RouteMap> {
    set<TPath extends PathsOf<TRouteMap>>(route: Route, breadcrumb: Array<Breadcrumb<TRouteMap, TPath>>): void;
    unset(route: Route): void;
    getBreadcrumbs(matches: RouteMatch[]): Array<Breadcrumb<TRouteMap, PathsOf<TRouteMap>>>;
}
export declare const BreadcrumbsContext: React.Context<BreadcrumbApi<RouteMap> | undefined>;
export declare function BreadcrumbsContextProvider<TRouteMap extends RouteMap>({ children, }: {
    children: React.ReactNode;
}): React.JSX.Element;
export {};
