import type { DiscoverAppMenuConfig, DiscoverAppMenuItemType, DiscoverAppMenuPopoverItem, DiscoverAppMenuPrimaryActionItem } from '../../types';
/**
 * Registry for managing AppMenuConfig items with Discover-specific types.
 * All run actions automatically receive DiscoverAppMenuRunActionParams with guaranteed onFinishAction.
 */
export declare class AppMenuRegistry {
    static CUSTOM_ITEMS_LIMIT: number;
    private items;
    private primaryActionItem?;
    /**
     * Register a custom menu item.
     * @param item The menu item to register
     */
    registerCustomItem(item: DiscoverAppMenuItemType): void;
    /**
     * Register a custom popover item under a parent menu item.
     * @param parentId The ID of the parent menu item
     * @param popoverItem The popover item to register
     */
    registerCustomPopoverItem(parentId: string, popoverItem: DiscoverAppMenuPopoverItem): void;
    /**
     * Register a menu item.
     * @param item The menu item to register
     */
    registerItem(item: DiscoverAppMenuItemType): void;
    /**
     * Register multiple menu items at once.
     * @param items Array of menu items to register
     */
    registerItems(items: DiscoverAppMenuItemType[]): void;
    /**
     * Set the primary action item for the app menu.
     * @param item The primary action item
     */
    setPrimaryActionItem(item: DiscoverAppMenuPrimaryActionItem): void;
    /**
     * Register a popover item for a specific parent menu item.
     * @param parentId The ID of the parent menu item
     * @param popoverItem The popover item to register
     */
    registerPopoverItem(parentId: string, popoverItem: DiscoverAppMenuPopoverItem): void;
    /**
     * Get the complete AppMenuConfig.
     * Items with registered popover items will have their items property populated.
     */
    getAppMenuConfig(): DiscoverAppMenuConfig;
}
