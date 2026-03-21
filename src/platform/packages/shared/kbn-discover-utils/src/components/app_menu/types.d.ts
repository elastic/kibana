import type { AppMenuItemType, AppMenuPopoverItem, AppMenuPrimaryActionItem, AppMenuRunActionParams, AppMenuSecondaryActionItem } from '@kbn/core-chrome-app-menu-components';
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
    parentTestId?: string;
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
 * Discover-specific popover item with typed run action
 */
export type DiscoverAppMenuPopoverItem = Omit<AppMenuPopoverItem, 'run'> & {
    run?: DiscoverAppMenuRunAction;
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
 * Discover-specific secondary action item with typed run action
 */
export type DiscoverAppMenuSecondaryActionItem = Omit<AppMenuSecondaryActionItem, 'run'> & {
    run?: DiscoverAppMenuRunAction;
};
/**
 * Discover-specific app menu config with typed menu items
 */
export interface DiscoverAppMenuConfig {
    items?: DiscoverAppMenuItemType[];
    primaryActionItem?: DiscoverAppMenuPrimaryActionItem;
    secondaryActionItem?: DiscoverAppMenuSecondaryActionItem;
}
