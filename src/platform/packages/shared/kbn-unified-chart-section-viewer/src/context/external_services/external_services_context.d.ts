import type { DiscoverSharedPublicStart } from '@kbn/discover-shared-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import React from 'react';
export interface ExternalServices {
    discoverShared?: DiscoverSharedPublicStart;
    dataViews?: DataViewsPublicPluginStart;
}
export interface ExternalServicesProviderProps {
    externalServices?: ExternalServices;
    children: React.ReactNode;
}
export declare const ExternalServicesProvider: ({ externalServices, children, }: ExternalServicesProviderProps) => React.JSX.Element;
export declare const useExternalServices: () => ExternalServices | undefined;
