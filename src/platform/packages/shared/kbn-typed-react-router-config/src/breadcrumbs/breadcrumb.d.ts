import type React from 'react';
import type { RequiredKeys } from 'utility-types';
import type { PathsOf, RouteMap, TypeOf } from '../types';
type AsParamsProps<TObject extends Record<string, any>> = RequiredKeys<TObject> extends never ? {} : {
    params: TObject;
};
export type RouterBreadcrumb<TRouteMap extends RouteMap> = <TRoutePath extends PathsOf<TRouteMap>>({}: {
    title: string;
    children: React.ReactNode;
    path: TRoutePath;
} & AsParamsProps<TypeOf<TRouteMap, TRoutePath, false>>) => React.ReactElement;
export declare function RouterBreadcrumb<TRouteMap extends RouteMap, TRoutePath extends PathsOf<TRouteMap>>({ title, path, params, children, }: {
    title: string;
    path: TRoutePath;
    children: React.ReactElement;
    params?: Record<string, any>;
}): React.ReactElement<any, string | React.JSXElementConstructor<any>>;
export {};
