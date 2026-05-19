import React from 'react';
import type { RouteMap, Router } from './types';
export declare const RouterContextProvider: ({ router, children, }: {
    router: Router<RouteMap>;
    children: React.ReactNode;
}) => React.JSX.Element;
export declare function useRouter<TRouteMap extends RouteMap = RouteMap>(): Router<TRouteMap>;
