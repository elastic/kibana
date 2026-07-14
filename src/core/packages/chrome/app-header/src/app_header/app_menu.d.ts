import React from 'react';
import { type AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
export interface AppMenuProps {
    menu?: AppMenuConfig & {
        isCollapsed?: boolean;
    };
    docLink?: string;
    showAddIntegrations?: boolean;
}
export declare const AppMenu: React.NamedExoticComponent<AppMenuProps>;
