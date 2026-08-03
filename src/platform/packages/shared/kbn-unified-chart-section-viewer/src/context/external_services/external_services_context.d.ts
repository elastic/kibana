import type { DocLinksStart, FeatureFlagsStart, NotificationsStart } from '@kbn/core/public';
import type { DiscoverSharedPublicStart } from '@kbn/discover-shared-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { Logger } from '@kbn/logging';
import React from 'react';
export interface ExternalServices {
    discoverShared?: DiscoverSharedPublicStart;
    dataViews?: DataViewsPublicPluginStart;
    /** Host notifications API for Discover ErrorCallout "View details". */
    notifications?: NotificationsStart;
    /** Host doc links for Discover ErrorCallout ES|QL reference footer. */
    docLinks?: DocLinksStart;
    logger?: Logger;
    featureFlags?: FeatureFlagsStart;
}
export interface ExternalServicesProviderProps {
    externalServices?: ExternalServices;
    children: React.ReactNode;
}
export declare const ExternalServicesProvider: ({ externalServices, children, }: ExternalServicesProviderProps) => React.JSX.Element;
export declare const useExternalServices: () => ExternalServices | undefined;
