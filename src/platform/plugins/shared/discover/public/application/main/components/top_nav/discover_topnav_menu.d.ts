import React, { type PropsWithChildren } from 'react';
import { BehaviorSubject } from 'rxjs';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import type { ChromeBreadcrumbsBadge } from '@kbn/core-chrome-browser';
import type { DiscoverTopNavHookResult } from './use_discover_topnav';
import type { DiscoverCustomizationContext } from '../../../../customizations';
export declare const discoverTopNavMenuContext: React.Context<{
    topNavMenu$: BehaviorSubject<AppMenuConfig | undefined>;
    topNavBadges$: BehaviorSubject<ChromeBreadcrumbsBadge[] | undefined>;
}>;
export declare const DiscoverTopNavMenuProvider: ({ customizationContext, children, }: PropsWithChildren<{
    customizationContext: DiscoverCustomizationContext;
}>) => React.JSX.Element;
export declare const DiscoverTopNavMenu: ({ topNavBadges, topNavMenu }: DiscoverTopNavHookResult) => null;
