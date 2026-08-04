import React from 'react';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import type { TopNavMenuProps } from '@kbn/navigation-plugin/public';
export interface LegacyDashboardHeaderProps {
    badges: NonNullable<TopNavMenuProps['badges']>;
    config?: AppMenuConfig;
    lastSavedId?: string;
}
/**
 * Dashboard header for classic chrome (or Project with Chrome Next disabled): the app menu, badges, and favorite
 * button are pushed through the imperative chrome APIs instead of a rendered `AppHeader`.
 */
export declare const LegacyDashboardHeader: ({ badges, config, lastSavedId, }: LegacyDashboardHeaderProps) => React.JSX.Element;
