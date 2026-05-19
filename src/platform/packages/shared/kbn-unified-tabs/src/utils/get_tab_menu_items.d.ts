import type { TabItem, GetTabMenuItems, TabMenuItem } from '../types';
import { type TabsState } from './manage_tabs';
export interface GetTabMenuItemsFnProps {
    tabsState: TabsState;
    maxItemsCount: number | undefined;
    onDuplicate: (item: TabItem) => void;
    onCloseOtherTabs: (item: TabItem) => void;
    onCloseTabsToTheRight: (item: TabItem) => void;
    /** Optional function to provide menu items placed after the core tab menu items */
    getTopTabMenuItems?: (item: TabItem) => TabMenuItem[];
    /** Optional function to provide additional menu items placed at the end of the menu */
    getAdditionalTabMenuItems?: (item: TabItem) => TabMenuItem[];
}
export declare const getTabMenuItemsFn: ({ tabsState, maxItemsCount, onDuplicate, onCloseOtherTabs, onCloseTabsToTheRight, getTopTabMenuItems, getAdditionalTabMenuItems, }: GetTabMenuItemsFnProps) => GetTabMenuItems;
