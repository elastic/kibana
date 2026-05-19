import type { AppMenuItemType, AppMenuPopoverItem, AppMenuPrimaryActionItem, AppMenuRunActionParams } from '@kbn/core-chrome-app-menu-components';
import type { ReactElement, ReactNode } from 'react';
export declare enum AppMenuActionId {
    new = "new",
    open = "open",
    share = "share",
    export = "export",
    alerts = "alerts",
    inspect = "inspect",
    createRule = "createRule",
    backgroundsearch = "backgroundSearch",
    manageRulesAndConnectors = "manageRulesAndConnectors"
}
/**
 * Discover-specific context that's always available in app menu run actions
 */
export interface DiscoverAppMenuContext extends Record<string, unknown> {
    onFinishAction: () => void;
}
/**
 * Typed params for Discover app menu actions with guaranteed context
 */
export interface DiscoverAppMenuRunActionParams extends AppMenuRunActionParams {
    context: DiscoverAppMenuContext;
}
/**
 * Discover-specific run action that always receives DiscoverAppMenuRunActionParams
 */
export type DiscoverAppMenuRunAction = (params: DiscoverAppMenuRunActionParams) => ReactElement | void | null | ReactNode | Promise<ReactElement | void | null | ReactNode>;
/**
 * Discover-specific popover item with typed run action and nested items
 */
export type DiscoverAppMenuPopoverItem = Omit<AppMenuPopoverItem, 'run' | 'items'> & {
    run?: DiscoverAppMenuRunAction;
    /**
     * Sub-items for nested submenus (e.g., "Create legacy rules" submenu)
     */
    items?: DiscoverAppMenuPopoverItem[];
};
/**
 * Discover-specific menu item type with typed run action and items
 */
export type DiscoverAppMenuItemType = Omit<AppMenuItemType, 'run' | 'items'> & {
    run?: DiscoverAppMenuRunAction;
    items?: DiscoverAppMenuPopoverItem[];
};
/**
 * Discover-specific primary action item with typed run action
 */
export type DiscoverAppMenuPrimaryActionItem = Omit<AppMenuPrimaryActionItem, 'run'> & {
    run?: DiscoverAppMenuRunAction;
};
/**
 * Discover-specific app menu config with typed menu items
 */
export interface DiscoverAppMenuConfig {
    items?: DiscoverAppMenuItemType[];
    primaryActionItem?: DiscoverAppMenuPrimaryActionItem;
}
