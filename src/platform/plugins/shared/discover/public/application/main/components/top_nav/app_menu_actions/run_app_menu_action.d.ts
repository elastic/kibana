import type { AppMenuItemType, AppMenuPopoverItem, AppMenuPrimaryActionItem } from '@kbn/core-chrome-app-menu-components';
import type { DiscoverAppMenuItemType, DiscoverAppMenuPopoverItem, DiscoverAppMenuPrimaryActionItem } from '@kbn/discover-utils';
import type { DiscoverServices } from '../../../../../build_services';
export declare function runAppMenuAction({ appMenuItem, anchorElement, services, returnFocus, }: {
    appMenuItem: DiscoverAppMenuItemType | DiscoverAppMenuPrimaryActionItem | DiscoverAppMenuPopoverItem;
    anchorElement: HTMLElement;
    services: DiscoverServices;
    returnFocus: () => void;
}): Promise<void>;
/**
 * Maps Discover-specific menu item types to their corresponding base AppMenu types.
 */
type EnhancedAppMenuItem<T> = T extends DiscoverAppMenuItemType ? AppMenuItemType : T extends DiscoverAppMenuPrimaryActionItem ? AppMenuPrimaryActionItem : T extends DiscoverAppMenuPopoverItem ? AppMenuPopoverItem : never;
type DiscoverAppMenuItem = DiscoverAppMenuItemType | DiscoverAppMenuPrimaryActionItem | DiscoverAppMenuPopoverItem;
/**
 * Transforms Discover-specific menu items into base AppMenu types by replacing
 * the run action with one that wraps the Discover-specific behavior.
 * This allows the items to be used with the core AppMenu component.
 */
export declare function enhanceAppMenuItemWithRunAction<T extends DiscoverAppMenuItem>({ appMenuItem, services, }: {
    appMenuItem: T;
    services: DiscoverServices;
}): EnhancedAppMenuItem<T>;
export {};
