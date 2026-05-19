import React from 'react';
import type { AppMountParameters, Capabilities } from '@kbn/core/public';
import type { ChromeBreadcrumbsBadge } from '@kbn/core-chrome-browser';
import type { DiscoverServices } from '../build_services';
import type { DiscoverCustomizationContext } from '../customizations';
export interface DiscoverRouterProps {
    services: DiscoverServices;
    customizationContext: DiscoverCustomizationContext;
    onAppLeave: AppMountParameters['onAppLeave'];
}
export declare const DiscoverRouter: ({ services, ...routeProps }: DiscoverRouterProps) => React.JSX.Element;
export declare const getReadOnlyBadge: ({ capabilities, }: {
    capabilities: Capabilities;
}) => ChromeBreadcrumbsBadge | undefined;
