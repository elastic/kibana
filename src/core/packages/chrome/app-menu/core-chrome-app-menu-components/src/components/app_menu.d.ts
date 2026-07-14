import React from 'react';
import type { AppMenuConfig, AppMenuStaticItem } from '../types';
export interface AppMenuItemsProps {
    config?: AppMenuConfig;
    visible?: boolean;
    /**
     * Whether to render the app menu in a collapsed state (showing only the overflow button).
     * Only available for the standalone app menu component.
     * TODO: Remove this in favour of container queries once EUI supports them https://github.com/elastic/eui/issues/8822
     */
    isCollapsed?: boolean;
    /**
     * Static items that always appear at the end of the overflow menu.
     */
    staticItems?: AppMenuStaticItem[];
}
export declare const AppMenuComponent: ({ config, visible, isCollapsed, staticItems, }: AppMenuItemsProps) => React.JSX.Element | null;
