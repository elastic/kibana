import type { History } from 'history';
import React from 'react';
import type { RouteMap, Router } from './types';
export declare function RouterProvider({ children, router, history, }: {
    router: Router<RouteMap>;
    history: History;
    children?: React.ReactNode;
}): React.JSX.Element;
