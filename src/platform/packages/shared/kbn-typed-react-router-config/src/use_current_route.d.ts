import React from 'react';
import type { RouteMatch } from './types';
export declare const CurrentRouteContextProvider: ({ match, element, children, }: {
    match: RouteMatch;
    element: React.ReactElement;
    children: React.ReactElement;
}) => React.JSX.Element;
export declare const useCurrentRoute: () => {
    match: RouteMatch;
    element: React.ReactElement;
};
