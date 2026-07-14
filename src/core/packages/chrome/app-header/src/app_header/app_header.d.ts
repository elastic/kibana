import type { ReactNode } from 'react';
import React from 'react';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import type { AppHeaderBack, AppHeaderBadge, AppHeaderMetadataItems, AppHeaderPadding, AppHeaderTab, AppHeaderTitle } from '../types';
export interface AppHeaderViewProps {
    title?: AppHeaderTitle;
    back?: AppHeaderBack | AppHeaderBack[];
    tabs?: AppHeaderTab[];
    badges?: AppHeaderBadge[];
    menu?: AppMenuConfig & {
        isCollapsed?: boolean;
    };
    favorite?: ReactNode;
    titleAppend?: ReactNode;
    metadata?: AppHeaderMetadataItems;
    sticky?: boolean;
    padding?: AppHeaderPadding;
    docLink?: string;
    showAddIntegrations?: boolean;
    /**
     * Omits the header's bottom border. Used when the content rendered below the header owns the
     * separating line instead (e.g. Discover using UnifiedTabs).
     */
    borderless?: boolean;
}
export declare const AppHeaderView: React.NamedExoticComponent<AppHeaderViewProps>;
export interface AppHeaderProps extends AppHeaderViewProps {
    title: AppHeaderTitle;
}
export declare const AppHeader: React.NamedExoticComponent<AppHeaderProps>;
